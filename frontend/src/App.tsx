// App.tsx — root component and single source of truth.
//
// State shape change (Structured Fields Refactor):
//   OLD: resumeLines: ResumeLineItem[]  (flat array)
//   NEW: resumeData:  UIResumeData | null  (structured object)
//
// Hover highlighting: still ref-based (no re-renders).
//   onFieldHover(field) → field.postingReference / field.backgroundReference
//
// Approve-all gate:
//   Only non-empty fields count. Empty fields (text === '') are always skipped.

import { useState, useRef }      from 'react'
import { TextareaField }         from './components/TextareaField'
import type { TextareaFieldHandle } from './components/TextareaField'
import { ResumeColumn }          from './components/ResumeColumn'
import { computePageEstimate }   from './utils/pageEstimate'
import {
  SAMPLE_JOB_POSTING,
  SAMPLE_BACKGROUND,
  SAMPLE_RESUME_DATA,
} from './sampleData'
import type {
  UIField, UIResumeData, UIExperienceEntry, UIEducationEntry,
  UIAdditionalEntry, AppStatus,
} from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeField(
  id: string,
  text: string,
  postingReference:    string[] = [],
  backgroundReference: string[] = [],
): UIField {
  return { id, text, approved: false, edited: false, postingReference, backgroundReference }
}

// Convert the raw API response (from /api/tailor) into the frontend UIResumeData shape.
//
// Hover-highlight rule:
//   • Fields whose text is copied verbatim from the background (personal details,
//     experience title/org/dates, education sub-fields) use the text itself as its
//     own backgroundReference — so hovering always highlights exactly where that
//     value came from, even though the LLM doesn't supply a separate reference.
//   • Fields with LLM-supplied references (summary, description, research, skills,
//     additional) keep those references as-is.
//   • postingReference is only set when the LLM provides it — verbatim fields
//     generally don't correspond to a specific posting excerpt.
function convertApiToUIData(api: {
  personalDetails: { name: string; email: string; phone: string; location: string; website: string; linkedin: string; github: string; googleScholar: string }
  summary:         { text: string; postingReference: string[]; backgroundReference: string[] }
  experience:      Array<{ title: string; organization: string; dates: string; description: string; postingReference: string[]; backgroundReference: string[] }>
  education:       Array<{ degree: string; institution: string; dates: string; advisor: string; details: string }>
  research:        Array<{ text: string; postingReference: string[]; backgroundReference: string[] }>
  skills:          Array<{ text: string; postingReference: string[]; backgroundReference: string[] }>
  additional:      Array<{ section: string; text: string; postingReference: string[]; backgroundReference: string[] }>
}): UIResumeData {
  const pd = api.personalDetails
  // For verbatim fields: if the value is non-empty, it is its own background reference.
  const self = (text: string): string[] => text.trim() ? [text.trim()] : []
  return {
    personalDetails: {
      name:          makeField('pd-name',     pd.name,          [], self(pd.name)),
      email:         makeField('pd-email',    pd.email,         [], self(pd.email)),
      phone:         makeField('pd-phone',    pd.phone,         [], self(pd.phone)),
      location:      makeField('pd-location', pd.location,      [], self(pd.location)),
      website:       makeField('pd-website',  pd.website,       [], self(pd.website)),
      linkedin:      makeField('pd-linkedin', pd.linkedin,      [], self(pd.linkedin)),
      github:        makeField('pd-github',   pd.github,        [], self(pd.github)),
      googleScholar: makeField('pd-scholar',  pd.googleScholar, [], self(pd.googleScholar)),
    },
    summary: makeField('sum-0', api.summary.text, api.summary.postingReference, api.summary.backgroundReference),
    experience: api.experience.map((e, i): UIExperienceEntry => ({
      id:           `exp-${i}`,
      // title/org/dates: verbatim from background → self-reference; no posting ref
      title:        makeField(`exp-${i}-title`, e.title,        [], self(e.title)),
      organization: makeField(`exp-${i}-org`,   e.organization, [], self(e.organization)),
      dates:        makeField(`exp-${i}-dates`,  e.dates,       [], self(e.dates)),
      // description: LLM-supplied refs carry the real evidence
      description:  makeField(`exp-${i}-desc`,   e.description,  e.postingReference, e.backgroundReference),
    })),
    education: api.education.map((e, i): UIEducationEntry => ({
      id:          `edu-${i}`,
      // all education sub-fields are verbatim from background → self-reference
      degree:      makeField(`edu-${i}-degree`, e.degree,      [], self(e.degree)),
      institution: makeField(`edu-${i}-inst`,   e.institution, [], self(e.institution)),
      dates:       makeField(`edu-${i}-dates`,  e.dates,       [], self(e.dates)),
      advisor:     makeField(`edu-${i}-advisor`,e.advisor,     [], self(e.advisor)),
      details:     makeField(`edu-${i}-details`,e.details,     [], self(e.details)),
    })),
    research: api.research.map((r, i) =>
      makeField(`res-${i}`, r.text, r.postingReference, r.backgroundReference)
    ),
    skills: api.skills.map((s, i) =>
      makeField(`skl-${i}`, s.text, s.postingReference, s.backgroundReference)
    ),
    additional: api.additional.map((a, i): UIAdditionalEntry => ({
      ...makeField(`add-${i}`, a.text, a.postingReference, a.backgroundReference),
      section: a.section,
    })),
  }
}

// Walk the entire UIResumeData tree and apply `update` to the field whose id matches.
function updateFieldById(
  data: UIResumeData,
  id:   string,
  update: (f: UIField) => UIField,
): UIResumeData {
  const u = (f: UIField) => f.id === id ? update(f) : f
  return {
    ...data,
    personalDetails: {
      name:          u(data.personalDetails.name),
      email:         u(data.personalDetails.email),
      phone:         u(data.personalDetails.phone),
      location:      u(data.personalDetails.location),
      website:       u(data.personalDetails.website),
      linkedin:      u(data.personalDetails.linkedin),
      github:        u(data.personalDetails.github),
      googleScholar: u(data.personalDetails.googleScholar),
    },
    summary: u(data.summary),
    experience: data.experience.map(e => ({
      ...e,
      title:        u(e.title),
      organization: u(e.organization),
      dates:        u(e.dates),
      description:  u(e.description),
    })),
    education: data.education.map(e => ({
      ...e,
      degree:      u(e.degree),
      institution: u(e.institution),
      dates:       u(e.dates),
      advisor:     u(e.advisor),
      details:     u(e.details),
    })),
    research:   data.research.map(u),
    skills:     data.skills.map(u),
    additional: data.additional.map(f => ({ ...u(f), section: f.section })),
  }
}

// Flatten all UIFields from a UIResumeData tree.
function getAllFields(data: UIResumeData): UIField[] {
  return [
    ...Object.values(data.personalDetails) as UIField[],
    data.summary,
    ...data.experience.flatMap(e => [e.title, e.organization, e.dates, e.description]),
    ...data.education.flatMap(e => [e.degree, e.institution, e.dates, e.advisor, e.details]),
    ...data.research,
    ...data.skills,
    ...data.additional,
  ]
}

// Build the structured export request from the current (fully-approved) UIResumeData.
function buildExportBody(data: UIResumeData, estimatedPages: number) {
  const t = (f: UIField) => f.text
  return {
    personalDetails: {
      name:          t(data.personalDetails.name),
      email:         t(data.personalDetails.email),
      phone:         t(data.personalDetails.phone),
      location:      t(data.personalDetails.location),
      website:       t(data.personalDetails.website),
      linkedin:      t(data.personalDetails.linkedin),
      github:        t(data.personalDetails.github),
      googleScholar: t(data.personalDetails.googleScholar),
    },
    summary: t(data.summary),
    experience: data.experience.map(e => ({
      title:        t(e.title),
      organization: t(e.organization),
      dates:        t(e.dates),
      description:  t(e.description),
    })),
    education: data.education.map(e => ({
      degree:      t(e.degree),
      institution: t(e.institution),
      dates:       t(e.dates),
      advisor:     t(e.advisor),
      details:     t(e.details),
    })),
    research:   data.research.map(t),
    skills:     data.skills.map(t),
    additional: data.additional.map(f => ({ section: f.section, text: t(f) })),
    estimatedPages,
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_JOB_WORDS        = 5_000
const MAX_BACKGROUND_WORDS = 15_000

type DownloadStatus = 'idle' | 'loading' | 'success'

// ── Component ─────────────────────────────────────────────────────────────────

export default function App() {
  const [jobPosting,  setJobPosting]  = useState(SAMPLE_JOB_POSTING)
  const [background,  setBackground]  = useState(SAMPLE_BACKGROUND)
  const [resumeData,  setResumeData]  = useState<UIResumeData | null>(SAMPLE_RESUME_DATA)
  const [status,      setStatus]      = useState<AppStatus>({ kind: 'idle' })
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')

  const jobPostingFieldRef = useRef<TextareaFieldHandle>(null)
  const backgroundFieldRef = useRef<TextareaFieldHandle>(null)

  function handleFieldHover(field: UIField | null) {
    jobPostingFieldRef.current?.setHighlight(field?.postingReference  ?? null)
    backgroundFieldRef.current?.setHighlight(field?.backgroundReference ?? null)
  }

  // ── Approve-all gate ───────────────────────────────────────────────────────
  // Empty fields (text === '') never count — user doesn't need to approve blanks.
  const allFields       = resumeData ? getAllFields(resumeData) : []
  const nonEmptyFields  = allFields.filter(f => f.text.trim() !== '')
  const approvedCount   = nonEmptyFields.filter(f => f.approved).length
  const totalCount      = nonEmptyFields.length
  const allApproved     = totalCount > 0 && approvedCount === totalCount

  const isLoading        = status.kind === 'loading'
  const estimatedPages   = resumeData ? computePageEstimate(resumeData) : 0

  // ── Input validation ───────────────────────────────────────────────────────

  function validateInputs(): string | null {
    if (!jobPosting.trim())  return 'Please paste a job posting before tailoring.'
    if (!background.trim())  return 'Please paste your background before tailoring.'
    return null
  }

  // ── Tailor ────────────────────────────────────────────────────────────────

  async function handleTailorClick() {
    const validationError = validateInputs()
    if (validationError) {
      setStatus({ kind: 'error', message: validationError })
      return
    }

    jobPostingFieldRef.current?.setHighlight(null)
    backgroundFieldRef.current?.setHighlight(null)
    setStatus({ kind: 'loading', stage: 1 })

    try {
      const response = await fetch('/api/tailor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobPosting, candidateBackground: background }),
      })

      const data = await response.json() as Record<string, unknown>

      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Server error')
      }

      const resume = data.resume as Parameters<typeof convertApiToUIData>[0]
      setResumeData(convertApiToUIData(resume))
      setStatus({ kind: 'done' })

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setStatus({ kind: 'error', message })
    }
  }

  // ── Field callbacks ────────────────────────────────────────────────────────

  // Section-level approval: set all listed field IDs to the target approved state.
  function handleApproveSection(ids: string[], approved: boolean) {
    setResumeData(prev => {
      if (!prev) return prev
      let data = prev
      for (const id of ids) {
        data = updateFieldById(data, id, f => ({ ...f, approved }))
      }
      return data
    })
  }

  function handleSave(id: string, newText: string) {
    setResumeData(prev =>
      prev ? updateFieldById(prev, id, f => ({ ...f, text: newText, edited: true })) : prev
    )
  }

  // ── Download ───────────────────────────────────────────────────────────────

  async function handleDownloadClick() {
    if (!resumeData || !allApproved) return
    setDownloadStatus('loading')

    try {
      const response = await fetch('/api/export', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildExportBody(resumeData, estimatedPages)),
      })

      if (!response.ok) throw new Error('Export failed — please try again.')

      const blob      = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor    = document.createElement('a')
      anchor.href     = objectUrl
      anchor.download = 'resume_tailored.docx'
      anchor.click()
      URL.revokeObjectURL(objectUrl)

      setDownloadStatus('success')
      setTimeout(() => setDownloadStatus('idle'), 2000)

    } catch (err) {
      console.error('[export]', err)
      setDownloadStatus('idle')
    }
  }

  const downloadDisabled = !allApproved || downloadStatus === 'loading'
  const downloadLabel    =
    downloadStatus === 'loading' ? 'Downloading…' :
    downloadStatus === 'success' ? 'Downloaded ✓' :
    'Download Resume'

  const downloadTitle = !allApproved
    ? totalCount === 0
      ? 'Tailor your resume first'
      : `Approve all ${totalCount} fields to download`
    : undefined

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">

      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1 className="logo">ReEmployed</h1>
            <p className="tagline">
              Get a resume grounded in what you've actually done.
            </p>
          </div>
        </div>
      </header>

      <main className="workspace">

        <section className="workspace-column">
          <TextareaField
            ref={jobPostingFieldRef}
            label="Job Posting"
            hint="Paste the full job description"
            value={jobPosting}
            onChange={setJobPosting}
            placeholder="Paste the full job posting here."
            maxWords={MAX_JOB_WORDS}
            highlightVariant="posting"
          />
        </section>

        <section className="workspace-column">
          <TextareaField
            ref={backgroundFieldRef}
            label="Your Background"
            hint="Paste your resume. More context is better. Projects, notes, rough thoughts. Messy is fine."
            value={background}
            onChange={setBackground}
            placeholder="Write everything relevant: roles, projects, papers, outcomes, skills."
            maxWords={MAX_BACKGROUND_WORDS}
            highlightVariant="background"
          />
        </section>

        <section className="workspace-column workspace-column--output">
          {resumeData ? (
            <ResumeColumn
              data={resumeData}
              estimatedPages={estimatedPages}
              onApproveSection={handleApproveSection}
              onSave={handleSave}
              onFieldHover={handleFieldHover}
            />
          ) : (
            <div className="resume-column resume-column--empty">
              <div className="resume-empty-state">
                <span className="resume-empty-icon">◎</span>
                <p className="resume-empty-title">Your tailored resume will appear here</p>
                <p className="resume-empty-hint">
                  Paste a job posting and your background, then click Tailor Resume.
                </p>
              </div>
            </div>
          )}
        </section>

      </main>

      <footer className="action-bar">
        {status.kind === 'error' && (
          <p className="action-error">{status.message}</p>
        )}

        <button
          className="tailor-button"
          onClick={handleTailorClick}
          disabled={isLoading}
        >
          {isLoading && <span className="button-spinner" aria-hidden />}
          {isLoading ? 'Tailoring your resume…' : 'Tailor Resume'}
          {!isLoading && <span className="button-arrow" aria-hidden>→</span>}
        </button>

        <button
          className="download-button"
          onClick={handleDownloadClick}
          disabled={downloadDisabled}
          data-success={downloadStatus === 'success'}
          title={downloadTitle}
        >
          {downloadLabel}
        </button>

      </footer>

    </div>
  )
}
