// types.ts — the data model for the entire application.
//
// Reading order: UIField → UIPersonalDetails → UIExperienceEntry →
//   UIEducationEntry → UIAdditionalEntry → UIResumeData → AppStatus

// ─────────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────────

export type TailorRequest = {
  jobPosting:          string
  candidateBackground: string
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 OUTPUT — Positioning Strategy (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export type PositioningStrategy = {
  roleArchetype:  string
  whatRoleValues: string[]
  fitAssessment:  string
  gaps:           string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMIC UNIT — UIField
// ─────────────────────────────────────────────────────────────────────────────

// Every single text value in the resume is a UIField — the user can approve,
// reject, or edit each one independently. Empty fields still render as boxes
// (visible to the user) but do not count toward the approve-all gate.
export type UIField = {
  id:                  string
  text:                string    // current value (user may have edited it)
  approved:            boolean
  edited:              boolean
  postingReference:    string[]  // verbatim job-posting excerpts (for hover highlight)
  backgroundReference: string[]  // verbatim background excerpts (for hover highlight)
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURED RESUME — each section is typed separately
// ─────────────────────────────────────────────────────────────────────────────

export type UIPersonalDetails = {
  name:          UIField
  email:         UIField
  phone:         UIField
  location:      UIField
  website:       UIField
  linkedin:      UIField
  github:        UIField
  googleScholar: UIField
}

export type UIExperienceEntry = {
  id:           string  // entry-level id, not a UIField itself
  title:        UIField
  organization: UIField
  dates:        UIField
  description:  UIField  // may contain newlines; rendered with white-space: pre-line
}

export type UIEducationEntry = {
  id:          string
  degree:      UIField
  institution: UIField
  dates:       UIField
  advisor:     UIField
  details:     UIField
}

// Additional section entry: Publications, Projects, Certifications, Volunteer, etc.
export type UIAdditionalEntry = UIField & {
  section: string  // e.g. "Publications", "Projects"
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL RESUME STATE
// ─────────────────────────────────────────────────────────────────────────────

export type UIResumeData = {
  personalDetails: UIPersonalDetails
  summary:         UIField
  experience:      UIExperienceEntry[]
  education:       UIEducationEntry[]
  research:        UIField[]       // omit array entirely if not applicable
  skills:          UIField[]       // omit array entirely if not applicable
  additional:      UIAdditionalEntry[]
}

// ─────────────────────────────────────────────────────────────────────────────
// UI STATE
// ─────────────────────────────────────────────────────────────────────────────

export type AppStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; stage: 1 | 2 }
  | { kind: 'error'; message: string }
  | { kind: 'done' }
