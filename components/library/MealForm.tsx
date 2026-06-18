'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Meal, MealType, UsdaFoodResult, RecipeSpec, MealIngredient } from '@/types'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@/types'
import UsdaSearchModal from './UsdaSearchModal'

interface Props {
  familyId: string
  meal?: Meal
  onDone: () => void
}

interface IngredientRow {
  name: string
  quantity: string
  unit: string
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
  const [servings, setServings] = useState((meal?.servings ?? 4).toString())
  const [isOutside, setIsOutside] = useState(meal?.is_outside ?? false)
  const [prepNote, setPrepNote] = useState(meal?.prep_ahead_note ?? '')
  const [steps, setSteps] = useState<string[]>(meal?.recipe_steps ?? [])
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    (meal?.ingredients ?? []).map(i => ({ name: i.name, quantity: i.quantity.toString(), unit: i.unit }))
  )
  const [showUsda, setShowUsda] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI recipe generation
  const [aiDish, setAiDish] = useState('')
  const [aiServings, setAiServings] = useState('6')
  const [generating, setGenerating] = useState(false)

  // Load existing ingredients when editing a saved meal
  useEffect(() => {
    if (!meal?.id) return
    let active = true
    supabase
      .from('meal_ingredients')
      .select('*')
      .eq('meal_id', meal.id)
      .then(({ data }) => {
        if (active && data && data.length) {
          setIngredients((data as MealIngredient[]).map(i => ({
            name: i.name, quantity: i.quantity.toString(), unit: i.unit,
          })))
        }
      })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal?.id])

  function applyUsda(r: UsdaFoodResult) {
    setName(r.description)
    setCalories(r.calories.toString())
    setProtein(r.protein_g.toString())
    setCarbs(r.carbs_g.toString())
    setFat(r.fat_g.toString())
    setUsdaFoodId(r.fdcId.toString())
    setShowUsda(false)
  }

  function applyRecipe(r: RecipeSpec) {
    setName(r.name)
    setDescription(r.description)
    setMealType(r.meal_type)
    setServings(r.servings.toString())
    setCalories(r.calories.toString())
    setProtein(r.protein_g.toString())
    setCarbs(r.carbs_g.toString())
    setFat(r.fat_g.toString())
    setTags(r.tags)
    setPrepNote(r.prep_ahead_note ?? '')
    setSteps(r.recipe_steps)
    setIngredients(r.ingredients.map(i => ({ name: i.name, quantity: i.quantity.toString(), unit: i.unit })))
  }

  async function generate() {
    if (!aiDish.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/recipe/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish: aiDish, servings: parseInt(aiServings) || 6 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      applyRecipe(data as RecipeSpec)
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  function setStep(i: number, v: string) {
    setSteps(s => s.map((x, idx) => (idx === i ? v : x)))
  }
  function setIngredient(i: number, patch: Partial<IngredientRow>) {
    setIngredients(rows => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      family_id: familyId,
      name, description: description || null,
      meal_type: mealType,
      calories: parseInt(calories) || 0,
      protein_g: parseInt(protein) || 0,
      carbs_g: parseInt(carbs) || 0,
      fat_g: parseInt(fat) || 0,
      tags: isOutside ? [...new Set([...tags, 'outside'])] : tags,
      usda_food_id: usdaFoodId || null,
      servings: parseInt(servings) || 4,
      is_outside: isOutside,
      prep_ahead_note: prepNote.trim() || null,
      recipe_steps: steps.map(s => s.trim()).filter(Boolean),
    }

    let mealId = meal?.id
    if (meal) {
      const { error: err } = await supabase.from('meals').update(payload).eq('id', meal.id)
      if (err) { setSaving(false); setError(err.message); return }
    } else {
      const { data, error: err } = await supabase.from('meals').insert(payload).select('id').single()
      if (err || !data) { setSaving(false); setError(err?.message ?? 'Insert failed'); return }
      mealId = data.id
    }

    // Replace ingredient rows (simple full-rewrite)
    if (mealId) {
      await supabase.from('meal_ingredients').delete().eq('meal_id', mealId)
      const rows = ingredients
        .filter(i => i.name.trim())
        .map(i => ({
          meal_id: mealId,
          name: i.name.trim(),
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit.trim() || 'unit',
          calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
        }))
      if (rows.length) await supabase.from('meal_ingredients').insert(rows)
    }

    setSaving(false)
    onDone()
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

        {/* AI recipe generator */}
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-violet-700">✨ Generate a recipe with AI</p>
          <div className="flex gap-2">
            <input value={aiDish} onChange={e => setAiDish(e.target.value)}
              placeholder="e.g. Palak Paneer"
              className="flex-1 border border-violet-300 rounded-lg px-3 py-2 text-sm" />
            <input type="number" value={aiServings} onChange={e => setAiServings(e.target.value)}
              min="1" max="12" title="Servings"
              className="w-16 border border-violet-300 rounded-lg px-2 py-2 text-sm" />
            <button type="button" onClick={generate} disabled={generating}
              className="bg-violet-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-violet-700 disabled:opacity-50 whitespace-nowrap">
              {generating ? '…' : 'Generate'}
            </button>
          </div>
          <p className="text-[11px] text-violet-500">Fills the form below (ingredients, steps, macros, prep). Review before saving.</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isOutside} onChange={e => setIsOutside(e.target.checked)} />
          Eating out / outside food (e.g. &quot;Chipotle Taco Day&quot;)
        </label>

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

        {!isOutside && (
          <>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Servings</label>
                <input type="number" value={servings} onChange={e => setServings(e.target.value)} min="1"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              {[['Calories', calories, setCalories], ['Protein (g)', protein, setProtein], ['Carbs (g)', carbs, setCarbs], ['Fat (g)', fat, setFat]].map(([l, v, set]) => (
                <div key={l as string}>
                  <label className="text-xs font-medium text-gray-600">{l as string}</label>
                  <input type="number" value={v as string} onChange={e => (set as (v: string) => void)(e.target.value)}
                    min="0" className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Prep-ahead note (soak / marinate the night before)</label>
              <input value={prepNote} onChange={e => setPrepNote(e.target.value)}
                placeholder="e.g. Soak chickpeas overnight"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <p className="text-[11px] text-gray-400 mt-1">If set, an evening reminder goes out the night before this meal is planned.</p>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Ingredients</label>
                <button type="button" onClick={() => setIngredients(r => [...r, { name: '', quantity: '', unit: '' }])}
                  className="text-xs text-blue-600 hover:underline">+ Add ingredient</button>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={ing.quantity} onChange={e => setIngredient(i, { quantity: e.target.value })}
                      placeholder="qty" className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    <input value={ing.unit} onChange={e => setIngredient(i, { unit: e.target.value })}
                      placeholder="unit" className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    <input value={ing.name} onChange={e => setIngredient(i, { name: e.target.value })}
                      placeholder="ingredient" className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    <button type="button" onClick={() => setIngredients(r => r.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-red-500 px-1">✕</button>
                  </div>
                ))}
                {ingredients.length === 0 && <p className="text-xs text-gray-400">No ingredients yet.</p>}
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Method</label>
                <button type="button" onClick={() => setSteps(s => [...s, ''])}
                  className="text-xs text-blue-600 hover:underline">+ Add step</button>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-xs text-gray-400 pt-2 w-5">{i + 1}.</span>
                    <textarea value={step} onChange={e => setStep(i, e.target.value)} rows={1}
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    <button type="button" onClick={() => setSteps(s => s.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-red-500 px-1 pt-1.5">✕</button>
                  </div>
                ))}
                {steps.length === 0 && <p className="text-xs text-gray-400">No steps yet.</p>}
              </div>
            </div>
          </>
        )}

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
