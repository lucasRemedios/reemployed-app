// ResumeColumn.tsx — the right column.
//
// Phase 2: renders a flat list of ResumeLineItems grouped by section.
//          No interaction yet — just structure and sizing.
// Phase 3: will replace the line rendering with the full verification UI
//          (approve/edit controls, reference highlights).
//
// The props are already typed against the real data model, so Phase 3
// slots in without changing the interface.

import type { ResumeLineItem } from '../types'

type ResumeColumnProps = {
  lines: ResumeLineItem[]
  // Phase 3 will add: onApprove, onEdit callbacks
}

// Group an array of lines by their `section` field.
// Lines with no section fall under 'General'.
function groupBySection(lines: ResumeLineItem[]): Record<string, ResumeLineItem[]> {
  return lines.reduce<Record<string, ResumeLineItem[]>>((acc, line) => {
    const key = line.section ?? 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(line)
    return acc
  }, {})
}

export function ResumeColumn({ lines }: ResumeColumnProps) {
  // ── Empty state ────────────────────────────────────────────────────────────
  if (lines.length === 0) {
    return (
      <div className="resume-column resume-column--empty">
        <div className="resume-empty-state">
          <span className="resume-empty-icon">◎</span>
          <p className="resume-empty-title">Your tailored resume will appear here</p>
          <p className="resume-empty-hint">
            Paste a job posting and your background, then click Tailor Resume.
          </p>
        </div>
      </div>
    )
  }

  // ── Populated state ────────────────────────────────────────────────────────
  const grouped = groupBySection(lines)

  return (
    <div className="resume-column">
      <div className="resume-header">
        <h2 className="column-label">Tailored Resume</h2>
        <p className="column-hint">Review each line — verification UI in Phase 3</p>
      </div>

      <div className="resume-lines">
        {Object.entries(grouped).map(([section, sectionLines]) => (
          <div key={section} className="resume-section">
            <h3 className="resume-section-title">{section}</h3>
            {sectionLines.map((line) => (
              <div key={line.id} className="resume-line-item">
                <p className="resume-line-text">{line.text}</p>
                {/* Phase 3 will replace this stub with the real verification UI */}
                <div className="resume-line-refs">
                  <span className="ref-chip ref-chip--posting" title={line.postingReference}>
                    ⌖ posting
                  </span>
                  <span className="ref-chip ref-chip--background" title={line.backgroundReference}>
                    ◈ background
  	          </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
