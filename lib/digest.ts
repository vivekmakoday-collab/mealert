import { createServiceClient } from './supabase-server'
import type { DigestMealSlot, Meal, MealPlanDay } from '@/types'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@/types'

export async function buildDigestSlots(familyId: string, date: string): Promise<DigestMealSlot[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('meal_plan_days')
    .select('*, breakfast:breakfast_meal_id(*), lunch:lunch_meal_id(*), snack:snack_meal_id(*), dinner:dinner_meal_id(*)')
    .eq('family_id', familyId)
    .eq('plan_date', date)
    .single()

  return MEAL_TYPES.map(type => ({
    label: MEAL_TYPE_LABELS[type],
    meal: data ? (data[type] as Meal | null) : null,
  }))
}

export async function getMemberEmails(familyId: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('members')
    .select('email')
    .eq('family_id', familyId)
  return (data ?? []).map(m => m.email).filter(Boolean)
}
