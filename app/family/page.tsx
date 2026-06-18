import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import MemberList from '@/components/family/MemberList'

export default async function FamilyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const familyId = user.user_metadata?.family_id
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('family_id', familyId)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Family Members</h1>
      <MemberList members={members ?? []} familyId={familyId} />
    </div>
  )
}
