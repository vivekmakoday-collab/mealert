'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Meal, MealPlanDay, MealType } from '@/types'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@/types'
import MealPickerModal from './MealPickerModal'

interface Props {
  days: MealPlanDay[]
  meals: Meal[]
  familyId: string
  weekDates: string[]
}

interface Picking {
  date: string
  mealType: MealType
}

export default function WeeklyGrid({ days: initial, meals, familyId, weekDates }: Props) {
  const supabase = createClient()
  const [days, setDays] = useState<MealPlanDay[]>(initial)
  const [picking, setPicking] = useState<Picking | null>(null)
  const [autoFilling, setAutoFilling] = useState(false)
  const [autoMsg, setAutoMsg] = useState<string | null>(null)

  async function autoFill(overwrite: boolean) {
    if (overwrite && !confirm('Replace every meal in this week with fresh AI suggestions? Meals you planned will be overwritten.')) {
      return
    }
    setAutoFilling(true)
    setAutoMsg(null)
    try {
      const res = await fetch('/api/autopopulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekDates, overwrite }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (Array.isArray(data.days)) setDays(data.days)
      setAutoMsg(data.filled > 0 ? `Updated ${data.filled} slot${data.filled === 1 ? '' : 's'}` : (data.message || 'Nothing to fill'))
    } catch (e) {
      setAutoMsg(String(e))
    } finally {
      setAutoFilling(false)
    }
  }

  function getDay(date: string) {
    return days.find(d => d.plan_date === date) ?? null
  }

  function getMeal(day: MealPlanDay | null, type: MealType): Meal | null {
    if (!day) return null
    return day[type] ?? null
  }

  async function assignMeal(date: string, mealType: MealType, meal: Meal | null) {
    const existing = days.find(d => d.plan_date === date)
    const col = `${mealType}_meal_id`
    if (existing) {
      const { data } = await supabase
        .from('meal_plan_days')
        .update({ [col]: meal?.id ?? null })
        .eq('id', existing.id)
        .select('*, breakfast:breakfast_meal_id(*), lunch:lunch_meal_id(*), snack:snack_meal_id(*), dinner:dinner_meal_id(*)')
        .single()
      if (data) setDays(d => d.map(x => x.id === data.id ? data : x))
    } else {
      const { data } = await supabase
        .from('meal_plan_days')
        .insert({ family_id: familyId, plan_date: date, [col]: meal?.id ?? null })
        .select('*, breakfast:breakfast_meal_id(*), lunch:lunch_meal_id(*), snack:snack_meal_id(*), dinner:dinner_meal_id(*)')
        .single()
      if (data) setDays(d => [...d, data])
    }
    setPicking(null)
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => autoFill(false)}
          disabled={autoFilling}
          className="bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {autoFilling && (
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {autoFilling ? 'Thinking…' : '✨ Auto-fill empty slots'}
        </button>
        <button
          onClick={() => autoFill(true)}
          disabled={autoFilling}
          className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          🔄 Regenerate whole week
        </button>
        {autoMsg && <span className="text-sm text-gray-500">{autoMsg}</span>}
      </div>
      <div
        className={`overflow-x-auto transition-opacity ${autoFilling ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="w-24 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
              {weekDates.map(date => {
                const d = new Date(date + 'T12:00:00')
                return (
                  <th key={date} className="py-2 px-2 text-center text-xs font-semibold text-gray-700">
                    <span className="block">{dayLabels[d.getDay()]}</span>
                    <span className="block text-gray-400 font-normal">{d.getDate()}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map(type => (
              <tr key={type} className="border-t border-gray-100">
                <td className="py-3 pr-3 text-xs font-semibold text-gray-500">{MEAL_TYPE_LABELS[type]}</td>
                {weekDates.map(date => {
                  const day = getDay(date)
                  const meal = getMeal(day, type)
                  return (
                    <td key={date} className="py-1 px-1">
                      <button
                        onClick={() => setPicking({ date, mealType: type })}
                        className={`w-full min-h-[52px] rounded-lg border text-left p-2 text-xs transition-colors ${
                          meal
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'border-dashed border-gray-200 text-gray-300 hover:border-blue-300 hover:text-blue-400'
                        }`}
                      >
                        {meal ? (
                          <>
                            <p className="font-medium leading-tight line-clamp-2">{meal.name}</p>
                            <p className="text-blue-400 mt-0.5">{meal.calories} kcal</p>
                          </>
                        ) : (
                          <span className="block text-center pt-2">+</span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {picking && (
        <MealPickerModal
          meals={meals}
          mealType={picking.mealType}
          onSelect={meal => assignMeal(picking.date, picking.mealType, meal)}
          onClear={() => assignMeal(picking.date, picking.mealType, null)}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}
