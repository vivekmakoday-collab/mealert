import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import SettingsForm from '@/components/settings/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const familyId = user.user_metadata?.family_id
  const { data: family } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single()

  if (!family) return <p className="p-8 text-red-500">Family not found. Check your setup.</p>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <SettingsForm family={family} />
    </div>
  )
}
