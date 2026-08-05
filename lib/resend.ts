import { Resend } from 'resend'

// Trim: a stray newline/space pasted into the env var makes Resend reject the
// key with "API key is invalid".
export const resend = new Resend((process.env.RESEND_API_KEY ?? '').trim())
