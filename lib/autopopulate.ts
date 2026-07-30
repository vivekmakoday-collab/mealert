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
export interface SlotAssignment {
  date: string
  meal_type: MealType
  existing_meal_id?: string
  new_meal?: NewMealSpec
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

  const system = `You are a meal planner for an Indian Hindu vegetarian (lacto-vegetarian: no meat, fish, or eggs) family. You build balanced, high-protein weekly meal plans. Prefer reusing meals from the existing library when a good fit exists; only invent a new meal when the library lacks a suitable option for a slot. New meals must be lacto-vegetarian, realistic, and include sensible per-serving macro estimates. Vary meals across the week — avoid assigning the same meal to the same slot on consecutive days. Honor every family member's dietary restrictions and allergies as hard constraints; treat likes/dislikes and macro targets as strong preferences.`

  const user = `Family preferences:
${summarizeFamily(members)}

Existing meal library:
${libraryByType}

Fill these empty meal-plan slots (one assignment each):
${slotsList}

Respond with ONLY a JSON object of this exact shape:
{
  "assignments": [
    { "date": "YYYY-MM-DD", "meal_type": "breakfast|lunch|snack|dinner", "existing_meal_id": "<one of the ids above>" }
    // OR, when no library meal fits:
    // { "date": "...", "meal_type": "...", "new_meal": { "name": "", "description": "", "meal_type": "", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "tags": [] } }
  ]
}
Rules: exactly one assignment per slot listed; each meal_type must match its slot; existing_meal_id must be a real id from the library above; new_meal is only for slots with no good library match. Return valid JSON, no prose.`

  const parsed = await generateJSON<{ assignments: SlotAssignment[] }>(system, user)
  return parsed.assignments ?? []
}
