'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Family } from '@/types'

export default function SettingsForm({ family }: { family: Family }) {
  const supabase = createClient()
  const [name, setName] = useState(family.name)
  const [digestTime, setDigestTime] = useState(family.digest_time)
  const [timezone, setTimezone] = useState(family.timezone)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const { error } = await supabase
      .from('families')
      .update({ name, digest_time: digestTime, timezone })
      .eq('id', family.id)
    setSaving(false)
    setMsg(error ? error.message : 'Saved!')
  }

  return (
    <form onSubmit={save} className="bg-white rounded-xl shadow p-6 max-w-lg flex flex-col gap-5">
      <div>
        <label className="text-sm font-medium text-gray-700">Family name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Daily digest time</label>
        <input
          type="time"
          value={digestTime}
          onChange={e => setDigestTime(e.target.value)}
          required
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Timezone</label>
        <input
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          required
          placeholder="America/New_York"
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      {msg && <p className={`text-sm ${msg === 'Saved!' ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
