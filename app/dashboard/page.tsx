import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Meal, MealType, PrepTask } from '@/types'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@/types'
import PrepTaskList from '@/components/dashboard/PrepTaskList'

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

// Static per-slot styling (full class names so Tailwind keeps them)
const SLOT_STYLE: Record<MealType, {
  emoji: string
  label: string
  time: string
  bar: string
  chip: string
}> = {
  breakfast: { emoji: '🌅', label: 'Breakfast', time: '8:00 AM', bar: 'bg-orange-400', chip: 'bg-orange-50 text-orange-700' },
  lunch:     { emoji: '☀️', label: 'Lunch',     time: '12:30 PM', bar: 'bg-sky-400',    chip: 'bg-sky-50 text-sky-700' },
  snack:     { emoji: '🍎', label: 'Snack',     time: '4:00 PM',  bar: 'bg-emerald-400', chip: 'bg-emerald-50 text-emerald-700' },
  dinner:    { emoji: '🌙', label: 'Dinner',    time: '7:30 PM',  bar: 'bg-indigo-400',  chip: 'bg-indigo-50 text-indigo-700' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const familyId = user.user_metadata?.family_id
  const todayDate = today()
  const tomorrowDate = tomorrow()

  const daySelect = '*, breakfast:breakfast_meal_id(*), lunch:lunch_meal_id(*), snack:snack_meal_id(*), dinner:dinner_meal_id(*)'

  const [{ data: planDay }, { data: tomorrowDay }, { data: members }, { count: mealCount }, { data: prepTasks }] =
    await Promise.all([
      supabase.from('meal_plan_days').select(daySelect).eq('family_id', familyId).eq('plan_date', todayDate).single(),
      supabase.from('meal_plan_days').select(daySelect).eq('family_id', familyId).eq('plan_date', tomorrowDate).single(),
      supabase.from('members').select('id, name').eq('family_id', familyId),
      supabase.from('meals').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
      supabase
        .from('prep_tasks')
        .select('*')
        .eq('family_id', familyId)
        .eq('task_date', tomorrowDate)
        .order('sort_order'),
    ])

  const slots: MealSlot[] = MEAL_TYPES.map(type => ({
    type,
    meal: planDay ? (planDay[type] as Meal | null) : null,
  }))

  // Day totals across planned meals
  const totals = slots.reduce(
    (acc, { meal }) => {
      if (meal && !meal.is_outside) {
        acc.calories += meal.calories
        acc.protein += meal.protein_g
        acc.carbs += meal.carbs_g
        acc.fat += meal.fat_g
      }
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

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

  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const plannedCount = slots.filter(s => s.meal).length

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 px-6 py-8 sm:px-8 mb-8 text-white shadow-lg">
        <div className="absolute -right-8 -top-10 text-[9rem] leading-none opacity-15 select-none" aria-hidden>🍽</div>
        <p className="text-blue-200 text-sm font-medium">{dateLabel}</p>
        <h1 className="text-3xl font-bold mt-1">{greeting}!</h1>
        <p className="text-blue-100 mt-2 text-sm">
          {plannedCount === 4
            ? 'Everything is planned for today. Enjoy! 🎉'
            : plannedCount > 0
              ? `${plannedCount} of 4 meals planned — ${4 - plannedCount} to go.`
              : 'Nothing planned yet — open the planner or let AI fill your week.'}
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          <Link href="/planner"
            className="bg-white text-indigo-700 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-50 transition-colors">
            Open planner
          </Link>
          <Link href="/library"
            className="bg-white/15 backdrop-blur rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/25 transition-colors">
            Meal library
          </Link>
        </div>
      </div>

      {/* AI prep checklist for tomorrow */}
      <PrepTaskList
        initialTasks={(prepTasks ?? []) as PrepTask[]}
        targetDate={tomorrowDate}
        targetLabel={tomorrowLabel}
      />

      {/* Prep-ahead notes recorded on the meals themselves */}
      {prepItems.length > 0 && (
        <div className="mb-8 rounded-2xl border-l-4 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Recipe prep notes for {tomorrowLabel}
          </p>
          <ul className="flex flex-col gap-1.5">
            {prepItems.map((item, i) => (
              <li key={i} className="text-sm text-amber-900">
                <span className="font-semibold">{item.note}</span>
                <span className="text-amber-700"> — {item.slotLabel.replace(/^[^\s]+\s/, '')} · {item.mealName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Today's meals timeline */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">Today&apos;s meals</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {slots.map(({ type, meal }) => {
          const s = SLOT_STYLE[type]
          return (
            <div key={type} className="group relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className={`absolute inset-y-0 left-0 w-1.5 ${s.bar}`} />
              <div className="p-5 pl-6">
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.chip}`}>
                    {s.emoji} {s.label}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">{s.time}</span>
                </div>
                {meal ? (
                  <>
                    <p className="font-bold text-gray-900 leading-snug">
                      {meal.is_outside && '🍴 '}{meal.name}
                    </p>
                    {meal.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{meal.description}</p>
                    )}
                    {meal.is_outside ? (
                      <p className="text-xs text-amber-600 font-medium mt-3">Eating out</p>
                    ) : (
                      <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-600">{meal.calories} kcal</span>
                        <span>P {meal.protein_g}g</span>
                        <span>C {meal.carbs_g}g</span>
                        <span>F {meal.fat_g}g</span>
                      </div>
                    )}
                    {meal.prep_ahead_note && (
                      <p className="text-[11px] text-amber-600 mt-2">🌙 needs prep ahead</p>
                    )}
                  </>
                ) : (
                  <div className="py-2">
                    <p className="text-gray-300 text-sm mb-2">Not planned</p>
                    <Link href="/planner" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                      + Plan this meal
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day nutrition summary */}
      {totals.calories > 0 && (
        <div className="mb-8 bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Today&apos;s nutrition</h2>
            <span className="text-xs text-gray-400">planned meals only</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{totals.calories}</p>
              <p className="text-xs text-blue-500 font-medium mt-0.5">kcal</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-4 text-center">
              <p className="text-2xl font-bold text-rose-700">{totals.protein}g</p>
              <p className="text-xs text-rose-500 font-medium mt-0.5">protein</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{totals.carbs}g</p>
              <p className="text-xs text-amber-500 font-medium mt-0.5">carbs</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{totals.fat}g</p>
              <p className="text-xs text-emerald-500 font-medium mt-0.5">fat</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/family" className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center text-xl">👨‍👩‍👧‍👦</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{members?.length ?? 0}</p>
            <p className="text-xs text-gray-500">Family members</p>
          </div>
          <span className="ml-auto text-gray-300 group-hover:text-violet-500 transition-colors">→</span>
        </Link>
        <Link href="/library" className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center text-xl">📖</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{mealCount ?? 0}</p>
            <p className="text-xs text-gray-500">Meals in library</p>
          </div>
          <span className="ml-auto text-gray-300 group-hover:text-sky-500 transition-colors">→</span>
        </Link>
        <Link href="/planner" className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">🗓</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{plannedCount}<span className="text-base text-gray-400">/4</span></p>
            <p className="text-xs text-gray-500">Today&apos;s slots planned</p>
          </div>
          <span className="ml-auto text-gray-300 group-hover:text-emerald-500 transition-colors">→</span>
        </Link>
      </div>
    </div>
  )
}
