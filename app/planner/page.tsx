import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import WeeklyGrid from '@/components/planner/WeeklyGrid'

function getWeekDates(offset = 0): string[] {
  const today = new Date()
  const day = today.getDay()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - day + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const weekOffset = parseInt(params.week ?? '0')
  const weekDates = getWeekDates(weekOffset)
  const familyId = user.user_metadata?.family_id

  const [{ data: days }, { data: meals }] = await Promise.all([
    supabase
      .from('meal_plan_days')
      .select('*, breakfast:breakfast_meal_id(*), lunch:lunch_meal_id(*), snack:snack_meal_id(*), dinner:dinner_meal_id(*)')
      .eq('family_id', familyId)
      .gte('plan_date', weekDates[0])
      .lte('plan_date', weekDates[6]),
    supabase.from('meals').select('*').eq('family_id', familyId).order('name'),
  ])

  const startLabel = new Date(weekDates[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = new Date(weekDates[6] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Planner</h1>
        <div className="flex items-center gap-3">
          <a href={`/planner?week=${weekOffset - 1}`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Prev</a>
          <span className="text-sm text-gray-600">{startLabel} – {endLabel}</span>
          <a href={`/planner?week=${weekOffset + 1}`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Next →</a>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow p-4">
        <WeeklyGrid
          days={days ?? []}
          meals={meals ?? []}
          familyId={familyId}
          weekDates={weekDates}
        />
      </div>
    </div>
  )
}
