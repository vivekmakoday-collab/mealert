'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Member } from '@/types'
import MemberForm from './MemberForm'

export default function MemberList({ members: initial, familyId }: { members: Member[]; familyId: string }) {
  const supabase = createClient()
  const [members, setMembers] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  async function remove(id: string) {
    if (!confirm('Remove this member?')) return
    await supabase.from('members').delete().eq('id', id)
    setMembers(m => m.filter(x => x.id !== id))
  }

  async function refresh() {
    const { data } = await supabase.from('members').select('*').eq('family_id', familyId)
    setMembers(data ?? [])
    setAdding(false)
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {members.map(m => (
        <div key={m.id} className="bg-white rounded-xl shadow p-4">
          {editing === m.id ? (
            <MemberForm familyId={familyId} member={m} onDone={refresh} />
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{m.name}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
                {m.dietary_restrictions.length > 0 && (
                  <p className="text-xs text-orange-600 mt-1">Restrictions: {m.dietary_restrictions.join(', ')}</p>
                )}
                {m.allergies.length > 0 && (
                  <p className="text-xs text-red-600">Allergies: {m.allergies.join(', ')}</p>
                )}
                {m.likes.length > 0 && <p className="text-xs text-green-600">Likes: {m.likes.join(', ')}</p>}
                {m.dislikes.length > 0 && <p className="text-xs text-gray-400">Dislikes: {m.dislikes.join(', ')}</p>}
                {m.calorie_target && (
                  <p className="text-xs text-blue-600 mt-1">
                    {m.calorie_target} kcal · {m.protein_target_g}g P · {m.carbs_target_g}g C · {m.fat_target_g}g F
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(m.id)} className="text-sm text-blue-600 hover:underline">Edit</button>
                <button onClick={() => remove(m.id)} className="text-sm text-red-500 hover:underline">Remove</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {adding ? (
        <div className="bg-white rounded-xl shadow p-4">
          <MemberForm familyId={familyId} onDone={refresh} />
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
          + Add family member
        </button>
      )}
    </div>
  )
}
