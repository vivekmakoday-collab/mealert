import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Meal, MealType } from '@/types'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@/types'

function today() {
  return new Date().toISOString().split('T')[0]
}

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

interface MealSlot {
  type: MealType
  meal: Meal | null
}

interface PrepItem {
  slotLabel: string
  mealName: string
  note: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const familyId = user.user_metadata?.family_id
  const todayDate = today()
  const tomorrowDate = tomorrow()

  const daySelect = '*, breakfast:breakfast_meal_id(*), lunch:lunch_meal_id(*), snack:snack_meal_id(*), dinner:dinner_meal_id(*)'

  const [{ data: planDay }, { data: tomorrowDay }, { data: members }, { count: mealCount }] = await Promise.all([
    supabase.from('meal_plan_days').select(daySelect).eq('family_id', familyId).eq('plan_date', todayDate).single(),
    supabase.from('meal_plan_days').select(daySelect).eq('family_id', familyId).eq('plan_date', tomorrowDate).single(),
    supabase.from('members').select('id, name').eq('family_id', familyId),
    supabase.from('meals').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
  ])

  const slots: MealSlot[] = MEAL_TYPES.map(type => ({
    type,
    meal: planDay ? (planDay[type] as Meal | null) : null,
  }))

  // Anything to soak / marinate tonight for tomorrow's meals
  const prepItems: PrepItem[] = MEAL_TYPES.flatMap(type => {
    const meal = tomorrowDay ? (tomorrowDay[type] as Meal | null) : null
    if (meal?.prep_ahead_note && meal.prep_ahead_note.trim()) {
      return [{ slotLabel: MEAL_TYPE_LABELS[type], mealName: meal.name, note: meal.prep_ahead_note.trim() }]
    }
    return []
  })

  const tomorrowLabel = new Date(tomorrowDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Today's Meals</h1>
        <p className="text-gray-500 text-sm mt-1">{dateLabel}</p>
      </div>

      {prepItems.length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🌙</span>
            <h2 className="font-semibold text-amber-900">Prep tonight for {tomorrowLabel}</h2>
          </div>
          <ul className="flex flex-col gap-2">
            {prepItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="mt-0.5">✅</span>
                <span>
                  <span className="font-medium">{item.note}</span>
                  <span className="text-amber-700"> — for {item.slotLabel.replace(/^[^\s]+\s/, '')} ({item.mealName})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {slots.map(({ type, meal }) => (
          <div key={type} className="bg-white rounded-xl shadow p-5">
            <p className="text-sm font-semibold text-gray-500 mb-2">{MEAL_TYPE_LABELS[type]}</p>
            {meal ? (
              <>
                <p className="font-semibold text-gray-900 text-lg">{meal.name}</p>
                {meal.description && <p className="text-sm text-gray-500 mt-0.5">{meal.description}</p>}
                <div className="flex gap-4 mt-3 text-xs text-gray-400">
                  <span>{meal.calories} kcal</span>
                  <span>{meal.protein_g}g protein</span>
                  <span>{meal.carbs_g}g carbs</span>
                  <span>{meal.fat_g}g fat</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-300 text-sm">Not planned</p>
                <Link href="/planner" className="text-xs text-blue-600 hover:underline">Plan it →</Link>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-sm text-gray-500">Family members</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{members?.length ?? 0}</p>
          <Link href="/family" className="text-xs text-blue-600 hover:underline mt-2 block">Manage →</Link>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-sm text-gray-500">Meals in library</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{mealCount ?? 0}</p>
          <Link href="/library" className="text-xs text-blue-600 hover:underline mt-2 block">View library →</Link>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-sm text-gray-500">Today's slots planned</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{slots.filter(s => s.meal).length}/4</p>
          <Link href="/planner" className="text-xs text-blue-600 hover:underline mt-2 block">Open planner →</Link>
        </div>
      </div>
    </div>
  )
}
