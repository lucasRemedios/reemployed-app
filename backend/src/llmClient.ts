// llmClient.ts — the ONLY file that knows which LLM provider we're using.
//
// Current provider: Groq (https://groq.com)
// Groq runs open-source models (Llama, Mixtral) on custom LPU hardware —
// extremely fast inference, generous free tier, OpenAI-compatible API.
//
// To swap providers (e.g. to Claude or OpenAI), rewrite only this file.
// Everything else in the codebase calls callLLM() and never knows the difference.
//
// Interface contract:
//   callLLM(systemPrompt, userMessage) → Promise<string>
//   The returned string is always the raw text content from the model.

import Groq from 'groq-sdk'

// Lazy singleton — the client is created the first time callLLM() is called,
// not when this module is imported. This matters because ES module imports are
// hoisted and run before dotenv.config() in index.ts, so process.env would be
// empty if we instantiated the client at the top level.
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

export async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const client = getClient()
  const MODEL  = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
  console.log(`[llmClient] Calling ${MODEL} | system: ${systemPrompt.length} chars | user: ${userMessage.length} chars`)

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system',  content: systemPrompt },
      { role: 'user',    content: userMessage  },
    ],
    // Ask the model to respond with valid JSON only.
    // Not all models support this — if it causes errors, remove it and
    // rely on the prompt instruction alone.
    response_format: { type: 'json_object' },
    temperature: 0.3,  // lower = more focused/deterministic output
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('Groq returned an empty response')

  console.log(`[llmClient] Response received: ${content.length} chars`)
  return content
}
