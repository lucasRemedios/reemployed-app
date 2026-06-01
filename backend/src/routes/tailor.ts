// routes/tailor.ts — the two-stage LLM pipeline.
//
// Stage 1: job posting → PositioningStrategy
// Stage 2: posting + background + strategy → structured resume JSON
//
// The new Stage 2 output shape is fully structured (not a flat lines array).
// See prompts.ts and frontend/src/types.ts for the field-level contract.

import { Request, Response } from 'express'
import { callLLMDetailed } from '../llmClient'
import type { LLMCallResult } from '../llmClient'
import { getSupabase } from '../supabaseClient'
import { STAGE_1_SYSTEM, STAGE_1_USER, STAGE_2_SYSTEM, STAGE_2_USER } from '../prompts'

// ── Debug info shape ───────────────────────────────────────────────────────────
// Only attached to the response when DEBUG_LLM=true or ?debug=1 is present.

type StageDebugInfo = {
  stage:          1 | 2
  model:          string
  systemPrompt:   string
  userMessage:    string
  rawResponse:    string
  parsedResponse: unknown
  parseError:     string | null
  latencyMs:      number
  tokenUsage:     LLMCallResult['usage'] | null
}

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

// ── Stage 1 validator ──────────────────────────────────────────────────────────

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

// ── Stage 2 helpers ────────────────────────────────────────────────────────────

function str(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback
}

function strArray(val: unknown): string[] {
  if (!Array.isArray(val)) return []
  return val.filter(v => typeof v === 'string') as string[]
}

function parsePersonalDetails(raw: unknown): {
  name: string; email: string; phone: string; location: string
  website: string; linkedin: string; github: string; googleScholar: string
} {
  const fallback = { name: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', googleScholar: '' }
  if (typeof raw !== 'object' || raw === null) return fallback
  const d = raw as Record<string, unknown>
  return {
    name:          str(d.name),
    email:         str(d.email),
    phone:         str(d.phone),
    location:      str(d.location),
    website:       str(d.website),
    linkedin:      str(d.linkedin),
    github:        str(d.github),
    googleScholar: str(d.googleScholar),
  }
}

function parseSummary(raw: unknown): {
  text: string; postingReference: string[]; backgroundReference: string[]
} {
  const fallback = { text: '', postingReference: [], backgroundReference: [] }
  if (typeof raw !== 'object' || raw === null) return fallback
  const s = raw as Record<string, unknown>
  return {
    text:                str(s.text),
    postingReference:    strArray(s.postingReference),
    backgroundReference: strArray(s.backgroundReference),
  }
}

function parseExperience(raw: unknown): Array<{
  title: string; organization: string; dates: string; description: string
  competency: string[]; postingReference: string[]; backgroundReference: string[]
}> {
  if (!Array.isArray(raw)) return []
  return raw.map(item => {
    if (typeof item !== 'object' || item === null) return null
    const e = item as Record<string, unknown>
    return {
      title:               str(e.title),
      organization:        str(e.organization),
      dates:               str(e.dates),
      description:         str(e.description),
      // competency is a reasoning scaffold — parsed and passed through but never rendered
      competency:          strArray(e.competency),
      postingReference:    strArray(e.postingReference),
      backgroundReference: strArray(e.backgroundReference),
    }
  }).filter(Boolean) as Array<{
    title: string; organization: string; dates: string; description: string
    competency: string[]; postingReference: string[]; backgroundReference: string[]
  }>
}

function parseEducation(raw: unknown): Array<{
  degree: string; institution: string; dates: string; advisor: string; details: string
}> {
  if (!Array.isArray(raw)) return []
  return raw.map(item => {
    if (typeof item !== 'object' || item === null) return null
    const e = item as Record<string, unknown>
    return {
      degree:      str(e.degree),
      institution: str(e.institution),
      dates:       str(e.dates),
      advisor:     str(e.advisor),
      details:     str(e.details),
    }
  }).filter(Boolean) as Array<{
    degree: string; institution: string; dates: string; advisor: string; details: string
  }>
}

function parseTextItems(raw: unknown): Array<{
  text: string; postingReference: string[]; backgroundReference: string[]
}> {
  if (!Array.isArray(raw)) return []
  return raw.map(item => {
    if (typeof item !== 'object' || item === null) return null
    const r = item as Record<string, unknown>
    return {
      text:                str(r.text),
      postingReference:    strArray(r.postingReference),
      backgroundReference: strArray(r.backgroundReference),
    }
  }).filter(Boolean) as Array<{
    text: string; postingReference: string[]; backgroundReference: string[]
  }>
}

function parseAdditional(raw: unknown): Array<{
  section: string; text: string; postingReference: string[]; backgroundReference: string[]
}> {
  if (!Array.isArray(raw)) return []
  return raw.map(item => {
    if (typeof item !== 'object' || item === null) return null
    const a = item as Record<string, unknown>
    return {
      section:             str(a.section, 'Other'),
      text:                str(a.text),
      postingReference:    strArray(a.postingReference),
      backgroundReference: strArray(a.backgroundReference),
    }
  }).filter(Boolean) as Array<{
    section: string; text: string; postingReference: string[]; backgroundReference: string[]
  }>
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function tailorHandler(req: Request, res: Response): Promise<void> {
  const { jobPosting, candidateBackground } = req.body as Record<string, unknown>

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

  // ── Debug gate ─────────────────────────────────────────────────────────────
  // Include LLM debug info in the response when DEBUG_LLM=true on the server
  // OR when the client appends ?debug=1 to the request.  Default: off.
  const debugMode   = process.env.DEBUG_LLM === 'true' || req.query.debug === '1'
  const debugStages: StageDebugInfo[] = []

  try {
    // ── Stage 1 ────────────────────────────────────────────────────────────────
    console.log('[tailor] Stage 1: analysing job posting…')
    const s1System = STAGE_1_SYSTEM
    const s1User   = STAGE_1_USER(jobPosting)
    const s1Start  = Date.now()
    const s1Result = await callLLMDetailed(s1System, s1User)
    const s1Ms     = Date.now() - s1Start

    const stage1Parsed = parseJson(s1Result.content)

    if (!isPositioningStrategy(stage1Parsed)) {
      throw new Error('Stage 1 response did not match the expected structure.')
    }
    console.log('[tailor] Stage 1 complete. Archetype:', stage1Parsed.roleArchetype)

    if (debugMode) debugStages.push({
      stage: 1, model: s1Result.model,
      systemPrompt: s1System, userMessage: s1User,
      rawResponse: s1Result.content, parsedResponse: stage1Parsed, parseError: null,
      latencyMs: s1Ms, tokenUsage: s1Result.usage ?? null,
    })

    // ── Stage 2 ────────────────────────────────────────────────────────────────
    console.log('[tailor] Stage 2: writing tailored resume…')
    // s2User is the FULL assembled message including the Stage 1 strategy object.
    const s2System = STAGE_2_SYSTEM
    const s2User   = STAGE_2_USER(jobPosting, candidateBackground, stage1Parsed)
    const s2Start  = Date.now()
    const s2Result = await callLLMDetailed(s2System, s2User)
    const s2Ms     = Date.now() - s2Start

    const stage2Parsed = parseJson(s2Result.content) as Record<string, unknown>

    const personalDetails = parsePersonalDetails(stage2Parsed.personalDetails)
    const summary         = parseSummary(stage2Parsed.summary)
    const experience      = parseExperience(stage2Parsed.experience)
    const education       = parseEducation(stage2Parsed.education)
    const research        = parseTextItems(stage2Parsed.research)
    const skills          = parseTextItems(stage2Parsed.skills)
    const additional      = parseAdditional(stage2Parsed.additional)

    console.log(
      `[tailor] Stage 2 complete.` +
      ` | name: "${personalDetails.name || '(none)'}"` +
      ` | experience: ${experience.length}` +
      ` | education: ${education.length}`
    )

    const resume = { personalDetails, summary, experience, education, research, skills, additional }

    if (debugMode) debugStages.push({
      stage: 2, model: s2Result.model,
      systemPrompt: s2System, userMessage: s2User,
      rawResponse: s2Result.content, parsedResponse: resume, parseError: null,
      latencyMs: s2Ms, tokenUsage: s2Result.usage ?? null,
    })

    // ── Persist to DB (authenticated requests only) ────────────────────────────
    // req.userId is set by optionalAuth middleware when a valid Bearer token is
    // present. Unauthenticated requests skip this block silently.
    // DB errors are logged but never surface as HTTP errors — the client already
    // has the resume data and the pipeline succeeded.
    if (req.userId) {
      try {
        const { error: dbError } = await getSupabase()
          .from('resume_runs')
          .insert({
            user_id:       req.userId,
            job_posting:   jobPosting,
            stage1_output: stage1Parsed,
            stage2_output: resume,
          })
        if (dbError) {
          console.error('[tailor] DB save failed:', dbError.message)
        } else {
          console.log(`[tailor] Resume run saved for user ${req.userId}`)
        }
      } catch (err) {
        console.error('[tailor] DB save error:', err instanceof Error ? err.message : err)
      }
    }

    res.json({
      strategy:    stage1Parsed,
      resume,
      generatedAt: new Date().toISOString(),
      ...(debugMode ? { debug: debugStages } : {}),
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[tailor] Pipeline error:', message)
    res.status(500).json({ error: message })
  }
}
