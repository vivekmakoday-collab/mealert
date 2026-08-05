import { generateJSON } from '@/lib/ai'
import type { Meal, MealType, Member } from '@/types'
import { MEAL_TYPES } from '@/types'

export interface EmptySlot {
  date: string
  meal_type: MealType
}

export interface NewMealSpec {
  name: string
  description: string
  meal_type: MealType
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  tags: string[]
}

// One assignment per empty slot: either reuse a library meal, or invent a new one.
// is_leftover marks a slot that reuses a meal cooked earlier in the week.
export interface SlotAssignment {
  date: string
  meal_type: MealType
  existing_meal_id?: string
  new_meal?: NewMealSpec
  is_leftover?: boolean
}

function summarizeFamily(members: Member[]): string {
  if (members.length === 0) return 'No specific family preferences on record.'
  return members
    .map(m => {
      const parts: string[] = [m.name]
      if (m.dietary_restrictions.length) parts.push(`restrictions: ${m.dietary_restrictions.join(', ')}`)
      if (m.allergies.length) parts.push(`allergies: ${m.allergies.join(', ')}`)
      if (m.likes.length) parts.push(`likes: ${m.likes.join(', ')}`)
      if (m.dislikes.length) parts.push(`dislikes: ${m.dislikes.join(', ')}`)
      if (m.calorie_target) parts.push(`~${m.calorie_target} kcal/day, ${m.protein_target_g}g protein target`)
      return '- ' + parts.join('; ')
    })
    .join('\n')
}

export async function suggestMeals(
  emptySlots: EmptySlot[],
  library: Meal[],
  members: Member[]
): Promise<SlotAssignment[]> {
  if (emptySlots.length === 0) return []

  const libraryByType = MEAL_TYPES.map(type => {
    const meals = library.filter(m => m.meal_type === type)
    const lines = meals.map(
      m => `  - id=${m.id} | ${m.name} | ${m.calories}kcal P${m.protein_g} C${m.carbs_g} F${m.fat_g} | tags: ${m.tags.join(', ') || 'none'}`
    )
    return `${type.toUpperCase()}:\n${lines.join('\n') || '  (none)'}`
  }).join('\n\n')

  const slotsList = emptySlots.map(s => `  - ${s.date} (${s.meal_type})`).join('\n')

  const system = `You are a meal planner for an Indian Hindu vegetarian (lacto-vegetarian: no meat, fish, or eggs) family. You build realistic, balanced, high-protein weekly plans the way a real household cooks — NOT a different elaborate dish for every slot.

Plan realistically:
- Nobody cooks 4 fresh meals a day. Cook a limited number of proper meals and REUSE them as leftovers on a later day. A dinner cooked on one day is commonly eaten as leftovers for the next day's lunch. Aim for roughly half of lunches (and some dinners) to be leftovers of an earlier cooked meal, not a fresh cook.
- To mark a slot as leftovers, assign the SAME existing_meal_id as the meal it comes from and set "is_leftover": true. The leftover slot must come on a LATER day (or later slot the same day) than the meal that was actually cooked.
- Keep breakfasts and snacks simple and quick (poha, chilla, fruit, yogurt, sprouts, nuts) — these are light, not elaborate cooked dinners.
- Reserve elaborate cooked dishes for lunch/dinner, and don't repeat the exact same cooked dish as a fresh cook twice in the week — reuse via leftovers instead.
- Prefer meals already in the library; only invent a new meal when nothing fits.

Honor every family member's dietary restrictions and allergies as hard constraints; treat likes/dislikes and macro targets as strong preferences. New meals must be lacto-vegetarian with sensible per-serving macros.`

  const user = `Family preferences:
${summarizeFamily(members)}

Existing meal library:
${libraryByType}

Fill these empty meal-plan slots (one assignment each), planning realistically with leftovers so not every slot is a fresh cook:
${slotsList}

Respond with ONLY a JSON object of this exact shape:
{
  "assignments": [
    { "date": "YYYY-MM-DD", "meal_type": "breakfast|lunch|snack|dinner", "existing_meal_id": "<id from library>", "is_leftover": false }
    // leftovers: same existing_meal_id as an earlier cooked meal, on a LATER day, with is_leftover: true
    // { "date": "...", "meal_type": "...", "existing_meal_id": "<same id cooked earlier>", "is_leftover": true }
    // only when nothing in the library fits:
    // { "date": "...", "meal_type": "...", "new_meal": { "name": "", "description": "", "meal_type": "", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "tags": [] }, "is_leftover": false }
  ]
}
Rules: exactly one assignment per slot listed; each meal_type must match its slot; existing_meal_id must be a real id from the library above; a leftover slot must reuse an id that is cooked (is_leftover:false) on an earlier day/slot; new_meal is only for slots with no good library match. Return valid JSON, no prose.`

  const parsed = await generateJSON<{ assignments: SlotAssignment[] }>(system, user)
  return parsed.assignments ?? []
}
