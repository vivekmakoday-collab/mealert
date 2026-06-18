import { NextRequest, NextResponse } from 'next/server'
import { searchUsda } from '@/lib/usda'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Missing q' }, { status: 400 })
  try {
    const results = await searchUsda(query)
    return NextResponse.json(results)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
