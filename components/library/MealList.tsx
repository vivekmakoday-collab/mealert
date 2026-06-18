'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Meal } from '@/types'
import { MEAL_TYPE_LABELS } from '@/types'
import MealForm from './MealForm'

export default function MealList({ meals: initial, familyId }: { meals: Meal[]; familyId: string }) {
  const supabase = createClient()
  const [meals, setMeals] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  async function remove(id: string) {
    if (!confirm('Delete this meal?')) return
    await supabase.from('meals').delete().eq('id', id)
    setMeals(m => m.filter(x => x.id !== id))
  }

  async function refresh() {
    const { data } = await supabase.from('meals').select('*').eq('family_id', familyId).order('name')
    setMeals(data ?? [])
    setAdding(false)
    setEditing(null)
  }

  const filtered = filter
    ? meals.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()) || m.tags.some(t => t.toLowerCase().includes(filter.toLowerCase())))
    : meals

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 items-center">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter meals…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" />
        <button onClick={() => setAdding(true)}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">
          + Add meal
        </button>
      </div>
      {adding && (
        <div className="bg-white rounded-xl shadow p-4">
          <MealForm familyId={familyId} onDone={refresh} />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(m => (
          <div key={m.id} className="bg-white rounded-xl shadow p-4">
            {editing === m.id ? (
              <MealForm familyId={familyId} meal={m} onDone={refresh} />
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">
                      {MEAL_TYPE_LABELS[m.meal_type]}
                    </span>
                    {m.tags.map(t => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                  <p className="font-medium text-gray-900 mt-1 truncate">{m.name}</p>
                  {m.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{m.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {m.calories} kcal · {m.protein_g}g P · {m.carbs_g}g C · {m.fat_g}g F
                  </p>
                </div>
                <div className="flex gap-2 ml-3">
                  <button onClick={() => setEditing(m.id)} className="text-sm text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => remove(m.id)} className="text-sm text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {filtered.length === 0 && !adding && (
        <p className="text-center text-gray-400 py-12">No meals yet. Add your first meal above.</p>
      )}
    </div>
  )
}
