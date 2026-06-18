import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateRecipe } from '@/lib/recipe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dish, servings } = (await req.json()) as { dish?: string; servings?: number }
  if (!dish || !dish.trim()) {
    return NextResponse.json({ error: 'Dish name required' }, { status: 400 })
  }

  const n = Math.min(Math.max(Number(servings) || 4, 1), 12)
  try {
    const recipe = await generateRecipe(dish.trim(), n)
    return NextResponse.json(recipe)
  } catch (e) {
    return NextResponse.json({ error: `AI error: ${String(e)}` }, { status: 500 })
  }
}
