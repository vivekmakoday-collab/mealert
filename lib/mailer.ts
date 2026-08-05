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
  return (process.env.EMAIL_PROVIDER ?? 'resend') === 'smtp' ? 'smtp' : 'resend'
}

export function fromAddress(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM.trim()
  if (provider() === 'smtp' && process.env.SMTP_USER) {
    return `MealAlert <${process.env.SMTP_USER.trim()}>`
  }
  return 'MealAlert <onboarding@resend.dev>'
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
