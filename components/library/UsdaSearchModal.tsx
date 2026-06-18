'use client'
import { useState } from 'react'
import type { UsdaFoodResult } from '@/types'

interface Props {
  onSelect: (result: UsdaFoodResult) => void
  onClose: () => void
}

export default function UsdaSearchModal({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UsdaFoodResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Search USDA FoodData Central</h2>
        <form onSubmit={search} className="flex gap-2 mb-4">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. grilled chicken"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? '…' : 'Search'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {results.map(r => (
            <button key={r.fdcId} onClick={() => onSelect(r)}
              className="text-left border border-gray-200 rounded-lg p-3 hover:bg-blue-50">
              <p className="text-sm font-medium">{r.description}</p>
              <p className="text-xs text-gray-500">
                {r.calories} kcal · {r.protein_g}g protein · {r.carbs_g}g carbs · {r.fat_g}g fat
              </p>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 text-sm text-gray-500 hover:text-gray-800">Close</button>
      </div>
    </div>
  )
}
