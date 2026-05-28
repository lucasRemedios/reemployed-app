// routes/tailor.ts — the two-stage LLM pipeline.
//
// Stage 1: send the job posting → get a positioning strategy
// Stage 2: send posting + background + strategy → get tailored resume lines
//
// The frontend sends one POST request and waits for the full result.
// Both LLM calls happen here sequentially.

import { Request, Response } from 'express'
import { callLLM } from '../llmClient'
import { STAGE_1_SYSTEM, STAGE_1_USER, STAGE_2_SYSTEM, STAGE_2_USER } from '../prompts'

// Word limits — must match the frontend constants in App.tsx
const MAX_JOB_WORDS        = 5_000
const MAX_BACKGROUND_WORDS = 15_000

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

// Strip markdown code fences if the model wraps its JSON in ```json … ```.
function parseJson(raw: string): unknown {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    return JSON.parse(stripped)
  } catch {
    console.error('[tailor] JSON parse failed. Raw response:\n', raw)
    throw new Error('The model returned a response that could not be parsed as JSON.')
  }
}

// Validate Stage 1 output shape before trusting it
function isPositioningStrategy(obj: unknown): obj is {
  roleArchetype: string
  whatRoleValues: string[]
  fitAssessment: string
  gaps: string[]
} {
  if (typeof obj !== 'object' || obj === null) return false
  const o = obj as Record<string, unknown>
  return (
    typeof o.roleArchetype === 'string' &&
    Array.isArray(o.whatRoleValues) &&
    typeof o.fitAssessment === 'string' &&
    Array.isArray(o.gaps)
  )
}

// Validate Stage 2 output shape before trusting it.
// postingReference and backgroundReference must be non-empty string arrays.
function isStringArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.every(v => typeof v === 'string')
}

function isLineArray(obj: unknown): obj is Array<{
  text: string
  postingReference: string[]
  backgroundReference: string[]
  section?: string
}> {
  if (!Array.isArray(obj)) return false
  return obj.every(
    item =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).text === 'string' &&
      isStringArray((item as Record<string, unknown>).postingReference) &&
      isStringArray((item as Record<string, unknown>).backgroundReference)
  )
}

export async function tailorHandler(req: Request, res: Response): Promise<void> {
  const { jobPosting, candidateBackground } = req.body as Record<string, unknown>

  // ── Validate inputs ──────────────────────────────────────────────────────
  if (typeof jobPosting !== 'string' || jobPosting.trim() === '') {
    res.status(400).json({ error: 'Job posting is required.' })
    return
  }
  if (typeof candidateBackground !== 'string' || candidateBackground.trim() === '') {
    res.status(400).json({ error: 'Candidate background is required.' })
    return
  }

  const jobWords = countWords(jobPosting)
  const bgWords  = countWords(candidateBackground)

  if (jobWords > MAX_JOB_WORDS) {
    res.status(400).json({ error: `Job posting exceeds ${MAX_JOB_WORDS.toLocaleString()} words (yours: ${jobWords.toLocaleString()}).` })
    return
  }
  if (bgWords > MAX_BACKGROUND_WORDS) {
    res.status(400).json({ error: `Background exceeds ${MAX_BACKGROUND_WORDS.toLocaleString()} words (yours: ${bgWords.toLocaleString()}).` })
    return
  }

  console.log(`[tailor] Starting pipeline | job: ${jobWords} words | background: ${bgWords} words`)

  try {
    // ── Stage 1: Positioning Strategy ───────────────────────────────────────
    console.log('[tailor] Stage 1: analysing job posting…')
    const stage1Raw    = await callLLM(STAGE_1_SYSTEM, STAGE_1_USER(jobPosting))
    const stage1Parsed = parseJson(stage1Raw)

    if (!isPositioningStrategy(stage1Parsed)) {
      throw new Error('Stage 1 response did not match the expected structure.')
    }
    console.log('[tailor] Stage 1 complete. Archetype:', stage1Parsed.roleArchetype)

    // ── Stage 2: Resume Tailoring ────────────────────────────────────────────
    console.log('[tailor] Stage 2: writing tailored resume…')
    const stage2Raw    = await callLLM(STAGE_2_SYSTEM, STAGE_2_USER(jobPosting, candidateBackground, stage1Parsed))
    const stage2Parsed = parseJson(stage2Raw) as Record<string, unknown>

    const lines = stage2Parsed.lines
    if (!isLineArray(lines)) {
      throw new Error('Stage 2 response did not contain a valid lines array.')
    }
    console.log(`[tailor] Stage 2 complete. Lines returned: ${lines.length}`)

    // ── Return combined result ───────────────────────────────────────────────
    res.json({
      strategy:    stage1Parsed,
      lines,
      generatedAt: new Date().toISOString(),
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[tailor] Pipeline error:', message)
    res.status(500).json({ error: message })
  }
}
