'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Meal, MealType, UsdaFoodResult } from '@/types'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@/types'
import UsdaSearchModal from './UsdaSearchModal'

interface Props {
  familyId: string
  meal?: Meal
  onDone: () => void
}

export default function MealForm({ familyId, meal, onDone }: Props) {
  const supabase = createClient()
  const [name, setName] = useState(meal?.name ?? '')
  const [description, setDescription] = useState(meal?.description ?? '')
  const [mealType, setMealType] = useState<MealType>(meal?.meal_type ?? 'breakfast')
  const [calories, setCalories] = useState(meal?.calories.toString() ?? '0')
  const [protein, setProtein] = useState(meal?.protein_g.toString() ?? '0')
  const [carbs, setCarbs] = useState(meal?.carbs_g.toString() ?? '0')
  const [fat, setFat] = useState(meal?.fat_g.toString() ?? '0')
  const [tags, setTags] = useState<string[]>(meal?.tags ?? [])
  const [usdaFoodId, setUsdaFoodId] = useState(meal?.usda_food_id ?? '')
  const [showUsda, setShowUsda] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyUsda(r: UsdaFoodResult) {
    setName(r.description)
    setCalories(r.calories.toString())
    setProtein(r.protein_g.toString())
    setCarbs(r.carbs_g.toString())
    setFat(r.fat_g.toString())
    setUsdaFoodId(r.fdcId.toString())
    setShowUsda(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      family_id: familyId,
      name, description: description || null,
      meal_type: mealType,
      calories: parseInt(calories),
      protein_g: parseInt(protein),
      carbs_g: parseInt(carbs),
      fat_g: parseInt(fat),
      tags,
      usda_food_id: usdaFoodId || null,
    }
    const { error: err } = meal
      ? await supabase.from('meals').update(payload).eq('id', meal.id)
      : await supabase.from('meals').insert(payload)
    setSaving(false)
    if (err) setError(err.message)
    else onDone()
  }

  return (
    <>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">{meal ? 'Edit meal' : 'New meal'}</h3>
          <button type="button" onClick={() => setShowUsda(true)}
            className="text-sm text-blue-600 hover:underline">
            Import from USDA
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select value={mealType} onChange={e => setMealType(e.target.value as MealType)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {MEAL_TYPES.map(t => <option key={t} value={t}>{MEAL_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[['Calories', calories, setCalories], ['Protein (g)', protein, setProtein], ['Carbs (g)', carbs, setCarbs], ['Fat (g)', fat, setFat]].map(([l, v, set]) => (
            <div key={l as string}>
              <label className="text-xs font-medium text-gray-600">{l as string}</label>
              <input type="number" value={v as string} onChange={e => (set as (v: string) => void)(e.target.value)}
                min="0" className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            </div>
          ))}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Tags</label>
          <input value={tags.join(', ')} onChange={e => setTags(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            placeholder="e.g. quick, vegetarian"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : meal ? 'Update meal' : 'Add meal'}
          </button>
          <button type="button" onClick={onDone} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>
        </div>
      </form>
      {showUsda && <UsdaSearchModal onSelect={applyUsda} onClose={() => setShowUsda(false)} />}
    </>
  )
}
