// App.tsx — root component and single source of truth.
//
// hoveredLine: when the user hovers a resume line card, we store it here.
// The two TextareaFields read from it to know what text to highlight.
// null = no hover active = no highlight shown.

import { useState }        from 'react'
import { TextareaField }   from './components/TextareaField'
import { ResumeColumn }    from './components/ResumeColumn'
import {
  SAMPLE_JOB_POSTING,
  SAMPLE_BACKGROUND,
  SAMPLE_LINES,
} from './sampleData'
import type { ResumeLineItem } from './types'

const MAX_JOB_WORDS        = 5_000
const MAX_BACKGROUND_WORDS = 15_000

export default function App() {
  // Pre-populated with sample data so the hover UI is demonstrable immediately.
  // Phase 4: these start empty; the user pastes their own content.
  const [jobPosting,  setJobPosting]  = useState(SAMPLE_JOB_POSTING)
  const [background,  setBackground]  = useState(SAMPLE_BACKGROUND)
  const [resumeLines, setResumeLines] = useState<ResumeLineItem[]>(SAMPLE_LINES)

  // Which line card the user is currently hovering.
  // Drives the highlight in the left two columns.
  const [hoveredLine, setHoveredLine] = useState<ResumeLineItem | null>(null)

  function handleApprove(id: string) {
    setResumeLines(prev =>
      prev.map(line => line.id === id ? { ...line, approved: !line.approved } : line)
    )
  }

  function handleSave(id: string, newText: string) {
    setResumeLines(prev =>
      prev.map(line => line.id === id ? { ...line, text: newText, edited: true } : line)
    )
  }

  function handleTailorClick() {
    // Phase 4: replace with real LLM pipeline.
    alert('LLM pipeline coming in Phase 4!')
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

        {/* Left — job posting */}
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

        {/* Middle — candidate background */}
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

        {/* Right — tailored resume */}
        <section className="workspace-column workspace-column--output">
          <ResumeColumn
            lines={resumeLines}
            onApprove={handleApprove}
            onSave={handleSave}
            onLineHover={setHoveredLine}
          />
        </section>

      </main>

      <footer className="action-bar">
        <button className="tailor-button" onClick={handleTailorClick}>
          Tailor Resume
          <span className="button-arrow" aria-hidden>→</span>
        </button>
      </footer>

    </div>
  )
}
