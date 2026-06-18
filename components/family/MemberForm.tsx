'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Member } from '@/types'

interface Props {
  familyId: string
  member?: Member
  onDone: () => void
}

function tagsInput(label: string, value: string[], onChange: (v: string[]) => void) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value.join(', ')}
        onChange={e => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
        placeholder="comma-separated"
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  )
}

export default function MemberForm({ familyId, member, onDone }: Props) {
  const supabase = createClient()
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [restrictions, setRestrictions] = useState<string[]>(member?.dietary_restrictions ?? [])
  const [allergies, setAllergies] = useState<string[]>(member?.allergies ?? [])
  const [likes, setLikes] = useState<string[]>(member?.likes ?? [])
  const [dislikes, setDislikes] = useState<string[]>(member?.dislikes ?? [])
  const [calories, setCalories] = useState(member?.calorie_target?.toString() ?? '')
  const [protein, setProtein] = useState(member?.protein_target_g?.toString() ?? '')
  const [carbs, setCarbs] = useState(member?.carbs_target_g?.toString() ?? '')
  const [fat, setFat] = useState(member?.fat_target_g?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      family_id: familyId,
      name, email,
      dietary_restrictions: restrictions,
      allergies, likes, dislikes,
      calorie_target: calories ? parseInt(calories) : null,
      protein_target_g: protein ? parseInt(protein) : null,
      carbs_target_g: carbs ? parseInt(carbs) : null,
      fat_target_g: fat ? parseInt(fat) : null,
    }
    const { error: err } = member
      ? await supabase.from('members').update(payload).eq('id', member.id)
      : await supabase.from('members').insert(payload)
    setSaving(false)
    if (err) setError(err.message)
    else onDone()
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>
      {tagsInput('Dietary restrictions', restrictions, setRestrictions)}
      {tagsInput('Allergies', allergies, setAllergies)}
      {tagsInput('Likes', likes, setLikes)}
      {tagsInput('Dislikes', dislikes, setDislikes)}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Daily macro targets (optional)</p>
      <div className="grid grid-cols-4 gap-3">
        {[['Calories', calories, setCalories], ['Protein (g)', protein, setProtein], ['Carbs (g)', carbs, setCarbs], ['Fat (g)', fat, setFat]].map(([l, v, set]) => (
          <div key={l as string}>
            <label className="text-xs font-medium text-gray-600">{l as string}</label>
            <input type="number" value={v as string} onChange={e => (set as (v: string) => void)(e.target.value)}
              min="0" className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : member ? 'Update member' : 'Add member'}
        </button>
        <button type="button" onClick={onDone}
          className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>
      </div>
    </form>
  )
}
