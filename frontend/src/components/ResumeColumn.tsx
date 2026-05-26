// ResumeColumn.tsx — the right column.
//
// Responsibilities:
//   1. Show a progress summary ("3 of 6 lines approved")
//   2. Group lines by section and render a ResumeLineCard for each
//   3. Pass onApprove / onSave callbacks down to each card

import type { ResumeLineItem } from '../types'
import { ResumeLineCard } from './ResumeLineCard'

type ResumeColumnProps = {
  lines:     ResumeLineItem[]
  onApprove: (id: string) => void
  onSave:    (id: string, newText: string) => void
}

function groupBySection(lines: ResumeLineItem[]): [string, ResumeLineItem[]][] {
  const map = new Map<string, ResumeLineItem[]>()
  for (const line of lines) {
    const key = line.section ?? 'General'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(line)
  }
  return Array.from(map.entries())
}

export function ResumeColumn({ lines, onApprove, onSave }: ResumeColumnProps) {

  // ── Empty state ──────────────────────────────────────────────────────────
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

  // ── Progress summary ─────────────────────────────────────────────────────
  const approvedCount = lines.filter(l => l.approved).length
  const total         = lines.length
  const progressPct   = Math.round((approvedCount / total) * 100)
  const allDone       = approvedCount === total

  const grouped = groupBySection(lines)

  return (
    <div className="resume-column">

      {/* Header + progress */}
      <div className="resume-header">
        <div className="resume-header-top">
          <h2 className="column-label">Tailored Resume</h2>
          <span className="progress-label" data-done={allDone}>
            {approvedCount} / {total} approved
          </span>
        </div>
        {/* Progress bar */}
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progressPct}%` }}
            data-done={allDone}
          />
        </div>
      </div>

      {/* Line cards grouped by section */}
      <div className="resume-lines">
        {grouped.map(([section, sectionLines]) => (
          <div key={section} className="resume-section">
            <h3 className="resume-section-title">{section}</h3>
            {sectionLines.map(line => (
              <ResumeLineCard
                key={line.id}
                line={line}
                onApprove={onApprove}
                onSave={onSave}
              />
            ))}
          </div>
        ))}
      </div>

    </div>
  )
}
