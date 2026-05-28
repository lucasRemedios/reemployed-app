// App.tsx — root component and single source of truth.
//
// Hover highlighting works via refs, not state:
//   jobPostingFieldRef.current.setHighlight(text)  ← direct DOM call
//   backgroundFieldRef.current.setHighlight(text)  ← direct DOM call
//
// This means hover events never cause App (or the TextareaFields) to re-render.
// The textarea text content is completely stable during hover.

import { useState, useRef }  from 'react'
import { TextareaField }     from './components/TextareaField'
import type { TextareaFieldHandle } from './components/TextareaField'
import { ResumeColumn }      from './components/ResumeColumn'
import {
  SAMPLE_JOB_POSTING,
  SAMPLE_BACKGROUND,
  SAMPLE_LINES,
} from './sampleData'
import type { ResumeLineItem, AppStatus } from './types'

const MAX_JOB_WORDS        = 5_000
const MAX_BACKGROUND_WORDS = 15_000

export default function App() {
  const [jobPosting,  setJobPosting]  = useState(SAMPLE_JOB_POSTING)
  const [background,  setBackground]  = useState(SAMPLE_BACKGROUND)
  const [resumeLines, setResumeLines] = useState<ResumeLineItem[]>(SAMPLE_LINES)
  const [status,      setStatus]      = useState<AppStatus>({ kind: 'idle' })

  // Refs to the two textarea fields — used to push highlight updates
  // directly into the DOM without going through React state/props.
  const jobPostingFieldRef = useRef<TextareaFieldHandle>(null)
  const backgroundFieldRef = useRef<TextareaFieldHandle>(null)

  // Called by ResumeColumn on mouse-enter/leave.
  // Directly calls setHighlight on each field — no state change, no re-render.
  function handleLineHover(line: ResumeLineItem | null) {
    jobPostingFieldRef.current?.setHighlight(line?.postingReference  ?? null)
    backgroundFieldRef.current?.setHighlight(line?.backgroundReference ?? null)
  }

  const isLoading = status.kind === 'loading'

  function validateInputs(): string | null {
    if (!jobPosting.trim())  return 'Please paste a job posting before tailoring.'
    if (!background.trim())  return 'Please paste your background before tailoring.'
    return null
  }

  async function handleTailorClick() {
    const validationError = validateInputs()
    if (validationError) {
      setStatus({ kind: 'error', message: validationError })
      return
    }

    // Clear any active highlights before loading
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

      const rawLines = data.lines as Array<{
        text: string
        postingReference: string
        backgroundReference: string
        section?: string
      }>

      const lines: ResumeLineItem[] = rawLines.map((line, i) => ({
        id:                  `line-${i}`,
        text:                line.text,
        postingReference:    line.postingReference,
        backgroundReference: line.backgroundReference,
        section:             line.section,
        approved:            false,
        edited:              false,
      }))

      setResumeLines(lines)
      setStatus({ kind: 'done' })

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setStatus({ kind: 'error', message })
    }
  }

  return (
    <div className="app-shell">

      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1 className="logo">ReEmployed</h1>
            <p className="tagline">
              Paste a job. Get a resume grounded in what you've actually done.
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
            hint="More than a resume — your full story"
            value={background}
            onChange={setBackground}
            placeholder="Write everything relevant: roles, projects, papers, outcomes, skills."
            maxWords={MAX_BACKGROUND_WORDS}
            highlightVariant="background"
          />
        </section>

        <section className="workspace-column workspace-column--output">
          <ResumeColumn
            lines={resumeLines}
            onApprove={(id) =>
              setResumeLines(prev =>
                prev.map(l => l.id === id ? { ...l, approved: !l.approved } : l)
              )
            }
            onSave={(id, newText) =>
              setResumeLines(prev =>
                prev.map(l => l.id === id ? { ...l, text: newText, edited: true } : l)
              )
            }
            onLineHover={handleLineHover}
          />
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
      </footer>

    </div>
  )
}
