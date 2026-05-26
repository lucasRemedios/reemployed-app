// App.tsx — root component and single source of truth for app state.
//
// State owned here:
//   jobPosting    — left column text
//   background    — middle column text
//   resumeLines   — the array of ResumeLineItems (Phase 4: populated by LLM;
//                   for now seeded with sample data)
//
// Handlers defined here and passed down as props:
//   handleApprove — toggles a line's `approved` flag
//   handleSave    — updates a line's text and sets `edited = true`
//
// Why here and not in ResumeColumn?
// Because in Phase 4 we'll want to read the final approved lines to produce
// the plain-text output. The data needs to live at the top level.

import { useState }       from 'react'
import { TextareaField }  from './components/TextareaField'
import { ResumeColumn }   from './components/ResumeColumn'
import { SAMPLE_LINES }   from './sampleData'
import type { ResumeLineItem } from './types'

const MAX_JOB_WORDS        = 5_000
const MAX_BACKGROUND_WORDS = 15_000

export default function App() {
  const [jobPosting,   setJobPosting]   = useState('')
  const [background,   setBackground]   = useState('')

  // Phase 4: replace SAMPLE_LINES with the real LLM output.
  const [resumeLines,  setResumeLines]  = useState<ResumeLineItem[]>(SAMPLE_LINES)

  // Toggle approved on a single line by id.
  // We never mutate state directly — we produce a new array with the one
  // changed item. This is the standard React immutable-update pattern.
  function handleApprove(id: string) {
    setResumeLines(prev =>
      prev.map(line =>
        line.id === id ? { ...line, approved: !line.approved } : line
      )
    )
  }

  // Commit an edited text to a line and mark it as edited.
  function handleSave(id: string, newText: string) {
    setResumeLines(prev =>
      prev.map(line =>
        line.id === id ? { ...line, text: newText, edited: true } : line
      )
    )
  }

  function handleTailorClick() {
    // Phase 4 will replace this with the real LLM pipeline.
    alert('LLM pipeline coming in Phase 4!')
  }

  return (
    <div className="app-shell">

      {/* ── Header ──────────────────────────────────────────────────────── */}
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

      {/* ── Three-column workspace ───────────────────────────────────────── */}
      <main className="workspace">

        <section className="workspace-column">
          <TextareaField
            label="Job Posting"
            hint="Paste the full job description"
            value={jobPosting}
            onChange={setJobPosting}
            placeholder="Paste the job posting here — the full text, not just the title. The more detail you include, the more precisely the resume can be tailored."
            maxWords={MAX_JOB_WORDS}
          />
        </section>

        <section className="workspace-column">
          <TextareaField
            label="Your Background"
            hint="More than a resume — your full story"
            value={background}
            onChange={setBackground}
            placeholder="Write everything relevant: roles, projects, papers, outcomes, skills, context. This should be longer and richer than a one-page resume — the LLM will select and shape from it, not invent."
            maxWords={MAX_BACKGROUND_WORDS}
          />
        </section>

        <section className="workspace-column workspace-column--output">
          <ResumeColumn
            lines={resumeLines}
            onApprove={handleApprove}
            onSave={handleSave}
          />
        </section>

      </main>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <footer className="action-bar">
        <button className="tailor-button" onClick={handleTailorClick}>
          Tailor Resume
          <span className="button-arrow" aria-hidden>→</span>
        </button>
      </footer>

    </div>
  )
}
