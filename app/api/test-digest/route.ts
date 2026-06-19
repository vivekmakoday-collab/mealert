import { NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { resend } from '@/lib/resend'
import { buildDigestSlots } from '@/lib/digest'
import { createClient } from '@/lib/supabase-server'
import DigestEmail from '@/emails/DigestEmail'

// On-demand test send to the logged-in user's own email. Returns the real
// Resend response so failures (unverified domain, bad key) are visible.
export async function POST() {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set on the server.' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.email) return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 })

  const familyId = user.user_metadata?.family_id
  const { data: family } = await supabase.from('families').select('*').eq('id', familyId).single()
  if (!family) return NextResponse.json({ error: 'Family not found.' }, { status: 404 })

  const date = new Date().toISOString().split('T')[0]
  const slots = await buildDigestSlots(familyId, date)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const html = await render(DigestEmail({ family, date, slots, appUrl }))

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'MealAlert <onboarding@resend.dev>',
    to: user.email,
    subject: `🍽 [Test] ${family.name} meal digest`,
    html,
  })

  if (error) {
    return NextResponse.json({ error: `Resend: ${error.message || JSON.stringify(error)}` }, { status: 502 })
  }
  return NextResponse.json({ ok: true, id: data?.id, to: user.email })
}
