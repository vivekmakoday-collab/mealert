import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { resend } from '@/lib/resend'
import { getPrepItems } from '@/lib/prep'
import { getMemberEmails } from '@/lib/digest'
import { createServiceClient } from '@/lib/supabase-server'
import PrepReminderEmail from '@/emails/PrepReminderEmail'

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

  // Prep is for tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const date = tomorrow.toISOString().split('T')[0]

  const items = await getPrepItems(family_id, date)
  if (items.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No prep needed for tomorrow' })
  }

  const emails = await getMemberEmails(family_id)
  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No members with email' })
  }

  const html = await render(PrepReminderEmail({ family, date, items }))
  const results = await Promise.allSettled(
    emails.map(to =>
      resend.emails.send({
        from: process.env.EMAIL_FROM || 'MealAlert <onboarding@resend.dev>',
        to,
        subject: `🌙 Prep reminder: ${items.length} thing${items.length === 1 ? '' : 's'} to prep tonight`,
        html,
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ sent, total: emails.length, items: items.length })
}
