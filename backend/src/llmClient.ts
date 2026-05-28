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

// Groq client — reads GROQ_API_KEY from process.env (loaded by dotenv in index.ts)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

// Model is configurable via .env so you can switch without touching code.
// Default: llama-3.3-70b-versatile — best quality on Groq for this use case.
const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'

export async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  console.log(`[llmClient] Calling ${MODEL} | system: ${systemPrompt.length} chars | user: ${userMessage.length} chars`)

  const completion = await groq.chat.completions.create({
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
