// Provider-agnostic JSON generation. Defaults to Google Gemini (free tier),
// switchable to Groq or Anthropic via AI_PROVIDER. All three expose an
// OpenAI-compatible /chat/completions endpoint we can hit with plain fetch.

type Provider = 'gemini' | 'groq' | 'anthropic'

interface ProviderConfig {
  baseUrl: string
  apiKey: string | undefined
  model: string
}

function resolveProvider(): ProviderConfig {
  const provider = (process.env.AI_PROVIDER ?? 'gemini') as Provider
  const model = process.env.AI_MODEL

  switch (provider) {
    case 'groq':
      return {
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        model: model || 'llama-3.3-70b-versatile',
      }
    case 'anthropic':
      return {
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: model || 'claude-opus-4-8',
      }
    case 'gemini':
    default:
      return {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: process.env.GEMINI_API_KEY,
        model: model || 'gemini-2.0-flash',
      }
  }
}

// Pull a JSON object out of a model response, tolerating code fences / prose.
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in model response')
  return body.slice(start, end + 1)
}

export async function generateJSON<T>(system: string, user: string): Promise<T> {
  const { baseUrl, apiKey, model } = resolveProvider()
  if (!apiKey) {
    throw new Error(`Missing API key for AI provider "${process.env.AI_PROVIDER ?? 'gemini'}". Set the matching *_API_KEY env var.`)
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`AI provider error ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = await res.json()
  const content: string | undefined = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')

  return JSON.parse(extractJson(content)) as T
}
