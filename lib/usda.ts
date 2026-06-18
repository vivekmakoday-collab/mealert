import type { UsdaFoodResult } from '@/types'

const BASE = 'https://api.nal.usda.gov/fdc/v1'
const KEY = process.env.USDA_API_KEY ?? 'DEMO_KEY'

interface UsdaSearchItem {
  fdcId: number
  description: string
  foodNutrients: Array<{ nutrientId: number; value: number }>
}

function nutrient(items: UsdaSearchItem['foodNutrients'], id: number): number {
  return Math.round(items.find(n => n.nutrientId === id)?.value ?? 0)
}

export async function searchUsda(query: string): Promise<UsdaFoodResult[]> {
  const res = await fetch(`${BASE}/foods/search?query=${encodeURIComponent(query)}&api_key=${KEY}&pageSize=10`)
  if (!res.ok) throw new Error('USDA API error')
  const json = await res.json()
  return (json.foods as UsdaSearchItem[]).map(f => ({
    fdcId: f.fdcId,
    description: f.description,
    calories: nutrient(f.foodNutrients, 1008),
    protein_g: nutrient(f.foodNutrients, 1003),
    carbs_g: nutrient(f.foodNutrients, 1005),
    fat_g: nutrient(f.foodNutrients, 1004),
  }))
}
