// prompts.ts — loads LLM prompt text from environment variables.
//
// Set these in:
//   - .env (local dev)              — PROMPT_STAGE1_SYSTEM, PROMPT_STAGE2_SYSTEM
//   - Render dashboard (production) — same keys, paste plain text as the value
//
// The USER prompt wrappers (STAGE_1_USER, STAGE_2_USER) are structural — they
// just slot in the runtime data. Only the SYSTEM prompts are configurable.

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

// Evaluated at module-load time → crashes at startup if either var is missing,
// which is the right behaviour (fail fast, not mid-request).
export const STAGE_1_SYSTEM: string = requireEnv('PROMPT_STAGE1_SYSTEM')

export const STAGE_1_USER = (jobPosting: string): string =>
  `Analyse this job posting and return the positioning strategy JSON:\n\n---\n${jobPosting}\n---`

export const STAGE_2_SYSTEM: string = requireEnv('PROMPT_STAGE2_SYSTEM')

export const STAGE_2_USER = (
  jobPosting:  string,
  background:  string,
  strategy:    object,
): string =>
  `Here is the job posting:\n---\n${jobPosting}\n---\n\n` +
  `Here is the candidate's full background:\n---\n${background}\n---\n\n` +
  `Here is the positioning strategy (from Stage 1 analysis):\n---\n${JSON.stringify(strategy, null, 2)}\n---\n\n` +
  `Write the tailored resume as JSON.`
