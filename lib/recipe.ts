import { generateJSON } from '@/lib/ai'
import type { RecipeSpec } from '@/types'

export async function generateRecipe(dish: string, servings: number): Promise<RecipeSpec> {
  const system = `You are a recipe developer for an Indian Hindu vegetarian (lacto-vegetarian: no meat, fish, or eggs) family. You write balanced, high-protein recipes with realistic per-serving nutrition estimates. Ingredient quantities must be scaled to the requested number of servings. If any ingredient needs soaking, marinating, fermenting, or other prep the night before, capture that in prep_ahead_note (otherwise use an empty string). Keep steps clear and in order.`

  const user = `Create a recipe for "${dish}" that serves ${servings} people.

Respond with ONLY a JSON object of this exact shape:
{
  "name": "",
  "description": "",
  "meal_type": "breakfast|lunch|snack|dinner",
  "servings": ${servings},
  "calories": 0,           // kcal per serving
  "protein_g": 0,          // per serving
  "carbs_g": 0,            // per serving
  "fat_g": 0,              // per serving
  "tags": [],
  "prep_ahead_note": "",   // e.g. "Soak chickpeas overnight", or "" if none
  "ingredients": [ { "name": "", "quantity": 0, "unit": "" } ],
  "recipe_steps": [ "step 1", "step 2" ]
}
Ingredient quantities scaled for ${servings} servings. Return valid JSON, no prose.`

  const spec = await generateJSON<RecipeSpec>(system, user)
  if (!spec.prep_ahead_note || !spec.prep_ahead_note.trim()) spec.prep_ahead_note = null
  if (!Array.isArray(spec.ingredients)) spec.ingredients = []
  if (!Array.isArray(spec.recipe_steps)) spec.recipe_steps = []
  if (!Array.isArray(spec.tags)) spec.tags = []
  return spec
}
