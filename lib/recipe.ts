import Anthropic from '@anthropic-ai/sdk'
import type { RecipeSpec } from '@/types'
import { MEAL_TYPES } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const recipeSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    meal_type: { type: 'string', enum: MEAL_TYPES },
    servings: { type: 'integer' },
    calories: { type: 'integer', description: 'kcal per serving' },
    protein_g: { type: 'integer', description: 'per serving' },
    carbs_g: { type: 'integer', description: 'per serving' },
    fat_g: { type: 'integer', description: 'per serving' },
    tags: { type: 'array', items: { type: 'string' } },
    prep_ahead_note: {
      type: 'string',
      description: 'If anything must be soaked/marinated/prepped the night before, a short instruction. Empty string if none.',
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
        },
        required: ['name', 'quantity', 'unit'],
        additionalProperties: false,
      },
    },
    recipe_steps: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'name', 'description', 'meal_type', 'servings', 'calories', 'protein_g',
    'carbs_g', 'fat_g', 'tags', 'prep_ahead_note', 'ingredients', 'recipe_steps',
  ],
  additionalProperties: false,
}

export async function generateRecipe(dish: string, servings: number): Promise<RecipeSpec> {
  const system = `You are a recipe developer for an Indian Hindu vegetarian (lacto-vegetarian: no meat, fish, or eggs) family. You write balanced, high-protein recipes with realistic per-serving nutrition estimates. Ingredient quantities must be scaled to the requested number of servings. If any ingredient needs soaking, marinating, fermenting, or other prep the night before, capture that in prep_ahead_note (otherwise return an empty string). Keep steps clear and numbered in order.`

  const user = `Create a recipe for "${dish}" that serves ${servings} people. Return full ingredients (scaled for ${servings} servings), step-by-step method, per-serving macros, sensible tags, and a prep_ahead_note if anything must be prepared in advance.`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    system,
    output_config: { format: { type: 'json_schema', schema: recipeSchema } },
    messages: [{ role: 'user', content: user }],
  } as Anthropic.MessageCreateParamsNonStreaming)

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('No response from model')

  const spec = JSON.parse(textBlock.text) as RecipeSpec
  // Normalize empty prep note to null
  if (!spec.prep_ahead_note || !spec.prep_ahead_note.trim()) spec.prep_ahead_note = null
  return spec
}
