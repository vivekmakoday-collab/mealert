import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generatePrepTasks, collectMealsForPrep } from '@/lib/preptasks'
import type { MealIngredient } from '@/types'

const DAY_SELECT =
  '*, breakfast:breakfast_meal_id(*), lunch:lunch_meal_id(*), snack:snack_meal_id(*), dinner:dinner_meal_id(*)'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const familyId = user.user_metadata?.family_id
  if (!familyId) return NextResponse.json({ error: 'No family' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const date: string = body.date || (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  const { data: day } = await supabase
    .from('meal_plan_days')
    .select(DAY_SELECT)
    .eq('family_id', familyId)
    .eq('plan_date', date)
    .single()

  if (!day) {
    return NextResponse.json({ tasks: [], message: 'Nothing planned for that day yet.' })
  }

  // Pull ingredients for the day's meals so the AI can reason about soaking etc.
  const mealIds = ['breakfast', 'lunch', 'snack', 'dinner']
    .map(t => (day[t] as { id?: string } | null)?.id)
    .filter((id): id is string => !!id)

  const ingredientsByMeal = new Map<string, MealIngredient[]>()
  if (mealIds.length) {
    const { data: ings } = await supabase
      .from('meal_ingredients')
      .select('*')
      .in('meal_id', mealIds)
    for (const ing of (ings ?? []) as MealIngredient[]) {
      const list = ingredientsByMeal.get(ing.meal_id) ?? []
      list.push(ing)
      ingredientsByMeal.set(ing.meal_id, list)
    }
  }

  const meals = collectMealsForPrep(day, ingredientsByMeal)
  if (meals.length === 0) {
    return NextResponse.json({ tasks: [], message: 'No cooked meals planned — nothing to prep.' })
  }

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  let generated
  try {
    generated = await generatePrepTasks(meals, dateLabel)
  } catch (e) {
    return NextResponse.json({ error: `AI error: ${String(e)}` }, { status: 500 })
  }

  // Replace any previous list for this date
  await supabase.from('prep_tasks').delete().eq('family_id', familyId).eq('task_date', date)

  if (generated.length === 0) {
    return NextResponse.json({ tasks: [], message: 'Nothing needs prepping ahead. 🎉' })
  }

  const rows = generated.map((t, i) => ({
    family_id: familyId,
    task_date: date,
    title: t.title,
    detail: t.detail || null,
    meal_name: t.meal_name || null,
    sort_order: i,
  }))

  const { data: inserted, error } = await supabase
    .from('prep_tasks')
    .insert(rows)
    .select('*')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: inserted ?? [] })
}
