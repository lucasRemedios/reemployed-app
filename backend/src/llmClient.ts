// llmClient.ts — the ONLY file that knows which LLM provider we're using.
//
// Provider: Groq (https://groq.com) for both pipelines.
//   Two-stage  → GROQ_MODEL          (default: llama-3.3-70b-versatile)
//   Single-stage → SINGLE_STAGE_MODEL (default: openai/gpt-oss-120b)
//
// Interface contract:
//   callLLM(system, user)               → Promise<string>         (two-stage)
//   callLLMDetailed(system, user)       → Promise<LLMCallResult>  (two-stage)
//   callSingleStageDetailed(system, user) → Promise<LLMCallResult> (single-stage)
//   getTokenBudgetRemaining()           → number | null           (in-memory TPD budget)

import Groq from 'groq-sdk'

// Known context window sizes (total tokens = input + output) for models on Groq.
// Verify values at https://console.groq.com/docs/rate-limits before relying on them.
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'llama-3.3-70b-versatile': 128_000,
  'llama-3.1-8b-instant':    131_072,
  'openai/gpt-oss-120b':     131_072,
}

// ── In-memory token budget ────────────────────────────────────────────────────
// Updated from the x-ratelimit-remaining-tokens response header after each call.
// Shared across all requests in this server process (good enough for a single
// demo instance; a real multi-worker setup would need Redis or similar).
let _tokenBudgetRemaining: number | null = null

export function getTokenBudgetRemaining(): number | null {
  return _tokenBudgetRemaining
}

function captureTokenBudget(headers: Headers): void {
  const raw = headers.get('x-ratelimit-remaining-tokens')
  if (raw !== null) {
    const val = parseInt(raw, 10)
    if (!isNaN(val)) {
      _tokenBudgetRemaining = val
      console.log(`[llmClient] TPD remaining: ${val.toLocaleString()} tokens`)
    }
  }
}

// ── Groq client singleton ─────────────────────────────────────────────────────

let _client: Groq | null = null

function getClient(): Groq {
  if (!_client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set — add it to your .env file.')
    }
    _client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _client
}

export type LLMCallResult = {
  content: string
  model:   string
  usage?:  {
    promptTokens:     number
    completionTokens: number
    totalTokens:      number
  }
}

// ── Two-stage pipeline ────────────────────────────────────────────────────────
// Uses GROQ_MODEL, response_format json_object, temp 0.3.
export async function callLLMDetailed(
  systemPrompt: string,
  userMessage:  string,
): Promise<LLMCallResult> {
  const client = getClient()
  const MODEL  = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
  console.log(`[llmClient] Calling ${MODEL} | system: ${systemPrompt.length} chars | user: ${userMessage.length} chars`)

  const { data: completion, response } = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  }).withResponse()

  captureTokenBudget(response.headers)

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('Groq returned an empty response')

  console.log(`[llmClient] Response received: ${content.length} chars`)

  const raw   = completion.usage
  const usage = raw ? {
    promptTokens:     raw.prompt_tokens,
    completionTokens: raw.completion_tokens,
    totalTokens:      raw.total_tokens,
  } : undefined

  return { content, model: MODEL, usage }
}

// Backward-compatible wrapper — returns just the string content.
export async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  return (await callLLMDetailed(systemPrompt, userMessage)).content
}

// ── Single-stage pipeline ─────────────────────────────────────────────────────
// Uses SINGLE_STAGE_MODEL. No response_format or temperature so reasoning models
// are supported; JSON output is enforced by the prompt alone.
export async function callSingleStageDetailed(
  systemPrompt: string,
  userMessage:  string,
): Promise<LLMCallResult> {
  const client = getClient()
  const MODEL  = process.env.SINGLE_STAGE_MODEL ?? 'openai/gpt-oss-120b'
  console.log(`[llmClient] Single-stage calling ${MODEL} | system: ${systemPrompt.length} chars | user: ${userMessage.length} chars`)

  const { data: completion, response } = await client.chat.completions.create({
    model:      MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
    max_tokens: 8000,   // headroom for verbose backgroundNeutralized + full resume JSON
  }).withResponse()

  captureTokenBudget(response.headers)

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('Groq returned an empty response (single-stage)')

  console.log(`[llmClient] Single-stage response: ${content.length} chars`)

  const raw   = completion.usage
  const usage = raw ? {
    promptTokens:     raw.prompt_tokens,
    completionTokens: raw.completion_tokens,
    totalTokens:      raw.total_tokens,
  } : undefined

  return { content, model: MODEL, usage }
}
