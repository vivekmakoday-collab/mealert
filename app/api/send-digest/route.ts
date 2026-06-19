import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { resend } from '@/lib/resend'
import { buildDigestSlots, getMemberEmails } from '@/lib/digest'
import { createServiceClient } from '@/lib/supabase-server'
import DigestEmail from '@/emails/DigestEmail'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-digest-secret')
  if (secret !== process.env.DIGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { family_id } = await req.json()
  if (!family_id) return NextResponse.json({ error: 'Missing family_id' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: family } = await supabase.from('families').select('*').eq('id', family_id).single()
  if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

  const date = new Date().toISOString().split('T')[0]
  const [slots, emails] = await Promise.all([
    buildDigestSlots(family_id, date),
    getMemberEmails(family_id),
  ])

  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No members with email' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const html = await render(DigestEmail({ family, date, slots, appUrl }))

  const results = await Promise.allSettled(
    emails.map(to =>
      resend.emails.send({
        from: process.env.EMAIL_FROM || 'MealAlert <onboarding@resend.dev>',
        to,
        subject: `🍽 Meal Plan for ${new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
        html,
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ sent, total: emails.length })
}
