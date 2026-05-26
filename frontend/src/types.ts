// types.ts — the data model for the entire application.
//
// This file defines the "shape" of every piece of data that moves through
// the system. No logic lives here — just descriptions of structure.
//
// Reading order: TailorRequest → PositioningStrategy → ResumeLineItem → TailoredResume → AppStatus
// That follows the data flow: input → stage 1 → stage 2 (atomic unit) → stage 2 (full result) → UI state

// ─────────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────────

// What the user submits when they click "Tailor Resume."
// These are the two text fields in the left and middle columns.
export type TailorRequest = {
  jobPosting: string           // contents of the left text field
  candidateBackground: string  // contents of the middle text field
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 OUTPUT — Positioning Strategy
// ─────────────────────────────────────────────────────────────────────────────

// What the LLM returns after reading only the job posting.
// This stage decides *how to frame the candidate* — it does not look at
// the background yet, and it does not invent anything.
export type PositioningStrategy = {
  // The category of role: e.g. "Applied Scientist at a growth-stage startup"
  // vs "Research Engineer at big tech." Drives tone and emphasis.
  roleArchetype: string

  // What this specific role is optimising for — pulled directly from the posting.
  // Array so each value can be displayed/highlighted individually.
  // e.g. ["production ML systems", "cross-functional collaboration", "fast iteration"]
  whatRoleValues: string[]

  // An honest, plain-English paragraph on how well the candidate fits.
  // The LLM is instructed to be candid — this is for the candidate's eyes,
  // not marketing copy.
  fitAssessment: string

  // Concrete gaps between the posting's requirements and a typical strong applicant.
  // e.g. ["No Kubernetes experience mentioned", "Role expects team lead experience"]
  gaps: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 OUTPUT — Tailored Resume (atomic unit)
// ─────────────────────────────────────────────────────────────────────────────

// One line or bullet in the tailored resume.
// Every claim must trace back to both the posting (why it's relevant) and
// the background (why it's true). Nothing is invented.
export type ResumeLineItem = {
  // Unique identifier for this line. Used by React to track items in a list
  // and by the edit/approve controls to target the right line.
  id: string

  // The actual tailored text the user will see and potentially put on their resume.
  // Editable in place in the UI.
  text: string

  // Which part of the job posting made this line relevant.
  // e.g. "Job requires 'experience deploying ML models to production'"
  postingReference: string

  // Which part of the candidate's background this line is grounded in.
  // e.g. "Candidate background: 'Deployed BERT-based classifier to AWS Lambda...'"
  backgroundReference: string

  // Which section of the resume this line belongs to.
  // e.g. "Summary", "Experience", "Skills", "Education"
  // Optional — not all lines need a section label.
  section?: string

  // ── UI state ──────────────────────────────────────────────────────────────
  // These two fields are UI concerns, not LLM output.
  // They live here because all app state is in-memory (no database in this version),
  // so the line item is the natural home for "what did the user do with this line."

  // Has the user clicked Approve on this line?
  approved: boolean

  // Has the user edited the text? Lets us show an "edited" badge in the UI.
  edited: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 OUTPUT — Tailored Resume (full result)
// ─────────────────────────────────────────────────────────────────────────────

// The complete output of the two-stage pipeline.
// Contains the strategy that drove the tailoring (for transparency)
// and the ordered list of line items.
export type TailoredResume = {
  // The Stage 1 result — preserved so the UI can show the user
  // *why* certain choices were made.
  strategy: PositioningStrategy

  // The ordered list of resume lines. Order matters — it reflects
  // the structure of the final resume (summary first, then experience, etc.)
  lines: ResumeLineItem[]

  // ISO 8601 timestamp of when this result was generated.
  // Useful for logging and for showing the user "generated just now."
  generatedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// UI STATE
// ─────────────────────────────────────────────────────────────────────────────

// The status of the app at any given moment.
//
// This uses a TypeScript "discriminated union" — a pattern where each variant
// has a `kind` field that acts as a label. It forces you to handle every
// possible state explicitly, which prevents bugs like "showing a spinner
// and an error message at the same time."
//
// Think of it like a Python Enum, but each variant can carry different data.
export type AppStatus =
  | { kind: 'idle' }                          // nothing has happened yet
  | { kind: 'loading'; stage: 1 | 2 }        // waiting on LLM — which stage?
  | { kind: 'error'; message: string }        // something went wrong
  | { kind: 'done' }                          // resume is ready, user is reviewing
