// App.tsx — root component and single source of truth.
//
// Phase 4 additions:
//   - AppStatus state: idle | loading | error | done
//   - handleTailorClick: validates inputs, calls /api/tailor, populates resume
//   - Error message shown in the action bar
//   - Button label changes during loading

import { useState }       from 'react'
import { TextareaField }  from './components/TextareaField'
import { ResumeColumn }   from './components/ResumeColumn'
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
  const [hoveredLine, setHoveredLine] = useState<ResumeLineItem | null>(null)

  // AppStatus drives the button label and whether errors are shown.
  const [status, setStatus] = useState<AppStatus>({ kind: 'idle' })

  const isLoading = status.kind === 'loading'

  function validateInputs(): string | null {
    if (!jobPosting.trim())   return 'Please paste a job posting before tailoring.'
    if (!background.trim())   return 'Please paste your background before tailoring.'
    return null
  }

  async function handleTailorClick() {
    const validationError = validateInputs()
    if (validationError) {
      setStatus({ kind: 'error', message: validationError })
      return
    }

    setStatus({ kind: 'loading', stage: 1 })
    setHoveredLine(null)

    try {
      const response = await fetch('/api/tailor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          jobPosting,
          candidateBackground: background,
        }),
      })

      // Parse the body regardless of status — error responses also contain JSON
      const data = await response.json() as Record<string, unknown>

      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Server error')
      }

      // Map raw LLM lines to ResumeLineItem[] by adding UI fields
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

  // Label shown inside the button depending on current status
  function buttonLabel(): string {
    if (status.kind === 'loading') return 'Tailoring your resume…'
    return 'Tailor Resume'
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
            label="Job Posting"
            hint="Paste the full job description"
            value={jobPosting}
            onChange={setJobPosting}
            placeholder="Paste the full job posting here."
            maxWords={MAX_JOB_WORDS}
            highlightText={hoveredLine?.postingReference}
            highlightVariant="posting"
          />
        </section>

        <section className="workspace-column">
          <TextareaField
            label="Your Background"
            hint="More than a resume — your full story"
            value={background}
            onChange={setBackground}
            placeholder="Write everything relevant: roles, projects, papers, outcomes, skills."
            maxWords={MAX_BACKGROUND_WORDS}
            highlightText={hoveredLine?.backgroundReference}
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
            onLineHover={setHoveredLine}
          />
        </section>

      </main>

      <footer className="action-bar">
        {/* Error message — shown to the left of the button */}
        {status.kind === 'error' && (
          <p className="action-error">{status.message}</p>
        )}

        <button
          className="tailor-button"
          onClick={handleTailorClick}
          disabled={isLoading}
        >
          {isLoading && <span className="button-spinner" aria-hidden />}
          {buttonLabel()}
          {!isLoading && <span className="button-arrow" aria-hidden>→</span>}
        </button>
      </footer>

    </div>
  )
}
