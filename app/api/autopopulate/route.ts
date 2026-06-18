import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { suggestMeals, type EmptySlot } from '@/lib/autopopulate'
import type { Meal, MealType, MealPlanDay } from '@/types'
import { MEAL_TYPES } from '@/types'

const SELECT_DAY =
  '*, breakfast:breakfast_meal_id(*), lunch:lunch_meal_id(*), snack:snack_meal_id(*), dinner:dinner_meal_id(*)'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const familyId = user.user_metadata?.family_id
  if (!familyId) return NextResponse.json({ error: 'No family' }, { status: 400 })

  const { weekDates, overwrite } = (await req.json()) as { weekDates: string[]; overwrite?: boolean }
  if (!Array.isArray(weekDates) || weekDates.length === 0) {
    return NextResponse.json({ error: 'weekDates required' }, { status: 400 })
  }

  // Load library, family, and the current week's plan days
  const [{ data: library }, { data: members }, { data: existingDays }] = await Promise.all([
    supabase.from('meals').select('*').eq('family_id', familyId),
    supabase.from('members').select('*').eq('family_id', familyId),
    supabase
      .from('meal_plan_days')
      .select('*')
      .eq('family_id', familyId)
      .in('plan_date', weekDates),
  ])

  const dayByDate = new Map<string, MealPlanDay>()
  for (const d of existingDays ?? []) dayByDate.set(d.plan_date, d as MealPlanDay)

  // Determine which slots to fill. With overwrite, regenerate every slot;
  // otherwise only the empty ones.
  const emptySlots: EmptySlot[] = []
  for (const date of weekDates) {
    const day = dayByDate.get(date)
    for (const type of MEAL_TYPES) {
      const filled = day?.[`${type}_meal_id` as keyof MealPlanDay]
      if (overwrite || !filled) emptySlots.push({ date, meal_type: type })
    }
  }

  if (emptySlots.length === 0) {
    return NextResponse.json({ filled: 0, message: 'Week already full' })
  }

  let assignments
  try {
    assignments = await suggestMeals(emptySlots, (library ?? []) as Meal[], members ?? [])
  } catch (e) {
    return NextResponse.json({ error: `AI error: ${String(e)}` }, { status: 500 })
  }

  // Resolve each assignment to a meal id (insert invented meals as we go)
  const validIds = new Set((library ?? []).map(m => m.id))
  const slotMealId = new Map<string, string>() // key: `${date}|${type}`

  for (const a of assignments) {
    const key = `${a.date}|${a.meal_type}`
    if (a.existing_meal_id && validIds.has(a.existing_meal_id)) {
      slotMealId.set(key, a.existing_meal_id)
    } else if (a.new_meal) {
      const { data: inserted } = await supabase
        .from('meals')
        .insert({
          family_id: familyId,
          name: a.new_meal.name,
          description: a.new_meal.description || null,
          meal_type: a.new_meal.meal_type,
          calories: a.new_meal.calories,
          protein_g: a.new_meal.protein_g,
          carbs_g: a.new_meal.carbs_g,
          fat_g: a.new_meal.fat_g,
          tags: [...new Set([...a.new_meal.tags, 'ai'])],
        })
        .select('id')
        .single()
      if (inserted) {
        validIds.add(inserted.id)
        slotMealId.set(key, inserted.id)
      }
    }
  }

  // Apply assignments to each day (only empty slots), then upsert
  let filled = 0
  for (const date of weekDates) {
    const existing = dayByDate.get(date)
    const row: Record<string, unknown> = {
      family_id: familyId,
      plan_date: date,
    }
    let touched = false
    for (const type of MEAL_TYPES) {
      const col = `${type}_meal_id`
      const current = existing?.[col as keyof MealPlanDay] as string | null | undefined
      const picked = slotMealId.get(`${date}|${type}`)
      if (!overwrite && current) {
        row[col] = current // preserve already-planned meal
      } else if (picked) {
        row[col] = picked // new pick (empty slot, or overwriting)
        touched = true
        filled++
      } else if (current) {
        row[col] = current // overwrite mode but AI returned nothing — keep existing
      }
    }
    if (!touched && !existing) continue // nothing to write for this day
    if (existing) row.id = existing.id

    await supabase
      .from('meal_plan_days')
      .upsert(row, { onConflict: 'family_id,plan_date' })
  }

  // Return the refreshed week so the grid can update
  const { data: days } = await supabase
    .from('meal_plan_days')
    .select(SELECT_DAY)
    .eq('family_id', familyId)
    .in('plan_date', weekDates)

  return NextResponse.json({ filled, days: days ?? [] })
}
