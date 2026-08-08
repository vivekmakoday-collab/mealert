import { generateJSON } from '@/lib/ai'
import type { Meal, MealIngredient } from '@/types'
import { MEAL_TYPE_LABELS, MEAL_TYPES } from '@/types'

export interface GeneratedTask {
  title: string
  detail?: string
  meal_name?: string
}

export interface MealForPrep {
  slotLabel: string
  meal: Meal
  ingredients: MealIngredient[]
}

export async function generatePrepTasks(
  meals: MealForPrep[],
  dateLabel: string
): Promise<GeneratedTask[]> {
  if (meals.length === 0) return []

  const menu = meals
    .map(({ slotLabel, meal, ingredients }) => {
      const lines = [`${slotLabel}: ${meal.name}${meal.is_outside ? ' (eating out)' : ''}`]
      if (meal.description) lines.push(`  about: ${meal.description}`)
      if (meal.prep_ahead_note) lines.push(`  known prep-ahead note: ${meal.prep_ahead_note}`)
      if (ingredients.length) {
        lines.push(`  ingredients: ${ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`).join(', ')}`)
      }
      if (meal.recipe_steps?.length) {
        lines.push(`  method: ${meal.recipe_steps.slice(0, 8).join(' | ')}`)
      }
      return lines.join('\n')
    })
    .join('\n\n')

  const system = `You are a practical kitchen assistant for an Indian Hindu vegetarian family. Given tomorrow's menu, you produce a short checklist of things that genuinely need doing TODAY (the night before) so tomorrow's cooking goes smoothly.

Only include real get-ahead work, such as:
- soaking (beans, lentils, chickpeas, rice), sprouting, fermenting batter
- marinating or setting curd/yogurt
- thawing frozen items
- chopping/prepping vegetables or masala that keeps overnight
- making dough, roasting/grinding spices, boiling and cooling something in advance
- taking something out of the freezer, or a quick shopping reminder for a clearly perishable missing item

Rules:
- Do NOT include tasks that must happen at cooking time tomorrow (e.g. "temper the spices", "serve hot").
- Do NOT invent prep for meals that need none. Simple meals (fruit, yogurt, nuts, toast) usually need nothing.
- Skip eating-out meals entirely.
- Keep each title short and actionable, imperative mood, under 80 characters.
- If nothing genuinely needs doing ahead, return an empty list.`

  const user = `Tomorrow is ${dateLabel}. Here is the planned menu:

${menu}

Produce the get-ahead checklist for tonight.

Respond with ONLY a JSON object of this exact shape:
{
  "tasks": [
    { "title": "Soak 2 cups rajma overnight", "detail": "optional short extra context", "meal_name": "Rajma Chawal" }
  ]
}
Return at most 8 tasks, ordered by when they should be done (longest lead time first). If nothing is needed, return {"tasks": []}. Valid JSON only, no prose.`

  const parsed = await generateJSON<{ tasks: GeneratedTask[] }>(system, user)
  return Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 8) : []
}

// Build the AI input from a joined meal_plan_days row + ingredient map.
export function collectMealsForPrep(
  day: Record<string, unknown> | null,
  ingredientsByMeal: Map<string, MealIngredient[]>
): MealForPrep[] {
  if (!day) return []
  return MEAL_TYPES.flatMap(type => {
    const meal = day[type] as Meal | null
    if (!meal || meal.is_outside) return []
    return [{
      slotLabel: MEAL_TYPE_LABELS[type],
      meal,
      ingredients: ingredientsByMeal.get(meal.id) ?? [],
    }]
  })
}
