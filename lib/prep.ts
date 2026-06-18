import { createServiceClient } from './supabase-server'
import type { Meal } from '@/types'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@/types'

export interface PrepItem {
  slotLabel: string
  mealName: string
  note: string
}

// Collect prep-ahead instructions for the meals planned on `date`.
export async function getPrepItems(familyId: string, date: string): Promise<PrepItem[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('meal_plan_days')
    .select('*, breakfast:breakfast_meal_id(*), lunch:lunch_meal_id(*), snack:snack_meal_id(*), dinner:dinner_meal_id(*)')
    .eq('family_id', familyId)
    .eq('plan_date', date)
    .single()

  if (!data) return []

  const items: PrepItem[] = []
  for (const type of MEAL_TYPES) {
    const meal = data[type] as Meal | null
    if (meal?.prep_ahead_note && meal.prep_ahead_note.trim()) {
      items.push({
        slotLabel: MEAL_TYPE_LABELS[type],
        mealName: meal.name,
        note: meal.prep_ahead_note.trim(),
      })
    }
  }
  return items
}
