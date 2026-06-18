export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner'

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner']

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '🌅 Breakfast',
  lunch: '☀️ Lunch',
  snack: '🍎 Snack',
  dinner: '🌙 Dinner',
}

export interface Family {
  id: string
  name: string
  digest_time: string   // "07:00"
  timezone: string      // "America/New_York"
  created_at: string
}

export interface Member {
  id: string
  family_id: string
  name: string
  email: string
  dietary_restrictions: string[]
  allergies: string[]
  likes: string[]
  dislikes: string[]
  calorie_target: number | null
  protein_target_g: number | null
  carbs_target_g: number | null
  fat_target_g: number | null
}

export interface MealIngredient {
  id: string
  meal_id: string
  name: string
  quantity: number
  unit: string
  usda_food_id: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface Meal {
  id: string
  family_id: string
  name: string
  description: string | null
  meal_type: MealType
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  tags: string[]
  usda_food_id: string | null
  servings: number
  recipe_steps: string[]
  prep_ahead_note: string | null
  is_outside: boolean
  // Optionally joined
  ingredients?: MealIngredient[]
}

// AI-generated recipe payload (before it becomes a Meal row)
export interface RecipeSpec {
  name: string
  description: string
  meal_type: MealType
  servings: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  tags: string[]
  prep_ahead_note: string | null
  ingredients: { name: string; quantity: number; unit: string }[]
  recipe_steps: string[]
}

export interface MealPlanDay {
  id: string
  family_id: string
  plan_date: string    // "2026-06-17"
  breakfast_meal_id: string | null
  lunch_meal_id: string | null
  snack_meal_id: string | null
  dinner_meal_id: string | null
  breakfast_is_leftover: boolean
  lunch_is_leftover: boolean
  snack_is_leftover: boolean
  dinner_is_leftover: boolean
  notes: string | null
  // Joined via Supabase select
  breakfast: Meal | null
  lunch: Meal | null
  snack: Meal | null
  dinner: Meal | null
}

export interface UsdaFoodResult {
  fdcId: number
  description: string
  calories: number       // kcal per 100g
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface DigestMealSlot {
  label: string
  meal: Meal | null
}
