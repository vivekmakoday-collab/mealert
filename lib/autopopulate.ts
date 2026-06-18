import Anthropic from '@anthropic-ai/sdk'
import type { Meal, MealType, Member } from '@/types'
import { MEAL_TYPES } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

const newMealSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    meal_type: { type: 'string', enum: MEAL_TYPES },
    calories: { type: 'integer' },
    protein_g: { type: 'integer' },
    carbs_g: { type: 'integer' },
    fat_g: { type: 'integer' },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'description', 'meal_type', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'tags'],
  additionalProperties: false,
}

const responseSchema = {
  type: 'object',
  properties: {
    assignments: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            properties: {
              date: { type: 'string' },
              meal_type: { type: 'string', enum: MEAL_TYPES },
              existing_meal_id: { type: 'string' },
            },
            required: ['date', 'meal_type', 'existing_meal_id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: { type: 'string' },
              meal_type: { type: 'string', enum: MEAL_TYPES },
              new_meal: newMealSchema,
            },
            required: ['date', 'meal_type', 'new_meal'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  required: ['assignments'],
  additionalProperties: false,
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

  const user = `Family preferences:\n${summarizeFamily(members)}\n\nExisting meal library:\n${libraryByType}\n\nFill these empty meal-plan slots (one assignment each):\n${slotsList}\n\nFor each slot, return either an existing_meal_id (must be one of the ids above and match the slot's meal type) or a new_meal object (whose meal_type matches the slot). Return exactly one assignment per slot listed.`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    system,
    output_config: { format: { type: 'json_schema', schema: responseSchema } },
    messages: [{ role: 'user', content: user }],
  } as Anthropic.MessageCreateParamsNonStreaming)

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('No response from model')

  const parsed = JSON.parse(textBlock.text) as { assignments: SlotAssignment[] }
  return parsed.assignments
}
