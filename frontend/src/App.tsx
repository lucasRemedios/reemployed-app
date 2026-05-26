// App.tsx — root component and single source of truth for app state.
//
// In React, "state" is data that can change over time and, when it changes,
// causes the UI to re-render. We use the `useState` hook to declare state.
//
// `useState(initialValue)` returns a pair: [currentValue, setterFunction].
// When you call the setter, React re-renders the component with the new value.
//
// For now, the only state is the two text field values.
// AppStatus, TailoredResume etc. will be added in Phase 4.

import { useState } from 'react'
import { TextareaField } from './components/TextareaField'
import { ResumeColumn }  from './components/ResumeColumn'
import { SAMPLE_LINES }  from './sampleData'

// Word limits — enforced by counting whitespace-separated tokens.
const MAX_JOB_WORDS        = 5_000
const MAX_BACKGROUND_WORDS = 15_000

export default function App() {
  // Controlled state for the two text inputs.
  // `jobPosting` and `background` are the current strings in each field.
  const [jobPosting,  setJobPosting]  = useState('')
  const [background,  setBackground]  = useState('')

  // Phase 2: show sample data in the right column so we can build the UI.
  // Phase 4: replace SAMPLE_LINES with the real LLM output.
  const resumeLines = SAMPLE_LINES

  function handleTailorClick() {
    // Phase 4 will replace this stub with the real LLM pipeline.
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

        {/* Left column — job posting */}
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

        {/* Middle column — candidate background */}
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

        {/* Right column — tailored resume output */}
        <section className="workspace-column workspace-column--output">
          <ResumeColumn lines={resumeLines} />
        </section>

      </main>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <footer className="action-bar">
        <button
          className="tailor-button"
          onClick={handleTailorClick}
        >
          Tailor Resume
          <span className="button-arrow" aria-hidden>→</span>
        </button>
      </footer>

    </div>
  )
}
