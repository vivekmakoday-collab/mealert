import { resend } from './resend'
import nodemailer from 'nodemailer'

// Two ways to send:
//   EMAIL_PROVIDER=resend  → Resend HTTP API (needs a verified domain to reach
//                            anyone other than your own account email)
//   EMAIL_PROVIDER=smtp    → any SMTP server, e.g. Gmail with an App Password.
//                            No domain purchase required.
export interface SendResult {
  ok: boolean
  id?: string
  error?: string
}

function provider(): 'resend' | 'smtp' {
  // Case/whitespace tolerant — "SMTP", " smtp " etc. all work.
  return (process.env.EMAIL_PROVIDER ?? 'resend').trim().toLowerCase() === 'smtp'
    ? 'smtp'
    : 'resend'
}

export function fromAddress(): string {
  const smtpUser = (process.env.SMTP_USER ?? '').trim()
  const configured = (process.env.EMAIL_FROM ?? '').trim()
  const host = (process.env.SMTP_HOST ?? 'smtp.gmail.com').trim().toLowerCase()

  if (provider() === 'smtp' && smtpUser) {
    // Gmail only lets you send as the authenticated account (or a verified
    // alias). A stale EMAIL_FROM pointing at some other domain would be
    // rewritten or rejected — so ignore it on Gmail.
    if (host.includes('gmail.com')) {
      const matchesUser = configured.toLowerCase().includes(smtpUser.toLowerCase())
      return matchesUser && configured ? configured : `MealAlert <${smtpUser}>`
    }
    return configured || `MealAlert <${smtpUser}>`
  }

  return configured || 'MealAlert <onboarding@resend.dev>'
}

let transporter: nodemailer.Transporter | null = null
function smtpTransport() {
  if (transporter) return transporter
  const host = (process.env.SMTP_HOST ?? 'smtp.gmail.com').trim()
  const port = parseInt((process.env.SMTP_PORT ?? '465').trim(), 10)
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: (process.env.SMTP_USER ?? '').trim(),
      // Gmail App Passwords are often shown with spaces — strip them.
      pass: (process.env.SMTP_PASS ?? '').replace(/\s+/g, ''),
    },
  })
  return transporter
}

export async function sendMail(opts: { to: string; subject: string; html: string }): Promise<SendResult> {
  const from = fromAddress()

  if (provider() === 'smtp') {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return { ok: false, error: 'SMTP_USER / SMTP_PASS are not set on the server.' }
    }
    try {
      const info = await smtpTransport().sendMail({ from, ...opts })
      return { ok: true, id: info.messageId }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY is not set on the server.' }
  }
  const { data, error } = await resend.emails.send({ from, ...opts })
  if (error) return { ok: false, error: error.message || JSON.stringify(error) }
  return { ok: true, id: data?.id }
}
