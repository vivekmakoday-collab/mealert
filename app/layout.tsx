import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase-server'
import TopNav from '@/components/TopNav'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Makoday's Meal",
  description: 'Family meal planning and daily digest',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  let user = null
  let familyName = "Makoday's Meal"
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('auth timeout')), 3000)),
    ])
    user = result.data.user
    const familyId = user?.user_metadata?.family_id
    if (familyId) {
      const { data } = await supabase
        .from('families')
        .select('name')
        .eq('id', familyId)
        .single()
      if (data) familyName = data.name
    }
  } catch {
    user = null
  }

  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        {user && <TopNav familyName={familyName} />}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
