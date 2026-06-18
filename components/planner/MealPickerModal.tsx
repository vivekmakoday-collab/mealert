'use client'
import { useState } from 'react'
import type { Meal, MealType } from '@/types'
import { MEAL_TYPE_LABELS } from '@/types'

interface Props {
  meals: Meal[]
  mealType: MealType
  onSelect: (meal: Meal, isLeftover: boolean) => void
  onClear: () => void
  onClose: () => void
}

export default function MealPickerModal({ meals, mealType, onSelect, onClear, onClose }: Props) {
  const [filter, setFilter] = useState('')
  const [leftover, setLeftover] = useState(false)
  const options = meals.filter(
    m => m.meal_type === mealType &&
      (!filter || m.name.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-3">Pick {MEAL_TYPE_LABELS[mealType]}</h2>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter meals…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
          <input type="checkbox" checked={leftover} onChange={e => setLeftover(e.target.checked)} />
          ♻️ This is leftovers from an earlier day
        </label>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {options.map(m => (
            <button key={m.id} onClick={() => onSelect(m, leftover)}
              className="text-left border border-gray-200 rounded-lg p-3 hover:bg-blue-50">
              <p className="text-sm font-medium">
                {m.is_outside && '🍴 '}{m.name}
              </p>
              <p className="text-xs text-gray-400">
                {m.is_outside ? 'Eating out' : `${m.calories} kcal · ${m.protein_g}g P · ${m.carbs_g}g C · ${m.fat_g}g F`}
              </p>
            </button>
          ))}
          {options.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No meals match</p>}
        </div>
        <div className="flex justify-between mt-4">
          <button onClick={onClear} className="text-sm text-red-500 hover:underline">Clear slot</button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>
        </div>
      </div>
    </div>
  )
}
