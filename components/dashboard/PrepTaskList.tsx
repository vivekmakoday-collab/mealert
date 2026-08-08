'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { PrepTask } from '@/types'

interface Props {
  initialTasks: PrepTask[]
  targetDate: string
  targetLabel: string
}

export default function PrepTaskList({ initialTasks, targetDate, targetLabel }: Props) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<PrepTask[]>(initialTasks)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function toggle(task: PrepTask) {
    const next = !task.is_done
    setTasks(t => t.map(x => (x.id === task.id ? { ...x, is_done: next } : x)))
    const { error } = await supabase.from('prep_tasks').update({ is_done: next }).eq('id', task.id)
    if (error) {
      // revert on failure
      setTasks(t => t.map(x => (x.id === task.id ? { ...x, is_done: !next } : x)))
      setMsg(error.message)
    }
  }

  async function generate() {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/prep-tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`)
      setTasks(data.tasks ?? [])
      if (data.message) setMsg(data.message)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const done = tasks.filter(t => t.is_done).length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  return (
    <div className="mb-8 rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-5 py-4 flex items-center gap-3">
        <span className="text-2xl">🌙</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-amber-900">Get ahead tonight</h2>
          <p className="text-xs text-amber-600">for {targetLabel}</p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="shrink-0 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg px-3 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading && (
            <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {loading ? 'Thinking…' : tasks.length ? '↻ Regenerate' : '✨ Generate list'}
        </button>
      </div>

      {tasks.length > 0 && (
        <div className="px-5 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-500 tabular-nums">{done}/{tasks.length}</span>
          </div>
        </div>
      )}

      <div className="p-5 pt-4">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400">
            {msg ?? 'No prep list yet — generate one from tomorrow’s menu.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {tasks.map(task => (
              <li key={task.id}>
                <button
                  onClick={() => toggle(task)}
                  className="w-full text-left flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors"
                >
                  <span
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs transition-colors ${
                      task.is_done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-gray-300 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${task.is_done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </span>
                    {(task.detail || task.meal_name) && (
                      <span className={`block text-xs mt-0.5 ${task.is_done ? 'text-gray-300' : 'text-gray-500'}`}>
                        {task.detail}
                        {task.detail && task.meal_name ? ' · ' : ''}
                        {task.meal_name}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {msg && tasks.length > 0 && <p className="text-xs text-gray-400 mt-3">{msg}</p>}
      </div>
    </div>
  )
}
