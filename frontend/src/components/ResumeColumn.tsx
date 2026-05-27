// ResumeColumn.tsx — right column: progress bar + grouped line cards.

import type { ResumeLineItem } from '../types'
import { ResumeLineCard } from './ResumeLineCard'

type Props = {
  lines:        ResumeLineItem[]
  onApprove:    (id: string) => void
  onSave:       (id: string, newText: string) => void
  onLineHover:  (line: ResumeLineItem | null) => void
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

export function ResumeColumn({ lines, onApprove, onSave, onLineHover }: Props) {

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

  const approvedCount = lines.filter(l => l.approved).length
  const total         = lines.length
  const progressPct   = Math.round((approvedCount / total) * 100)
  const allDone       = approvedCount === total

  return (
    <div className="resume-column">

      <div className="resume-header">
        <div className="resume-header-top">
          <h2 className="column-label">Tailored Resume</h2>
          <span className="progress-label" data-done={allDone}>
            {approvedCount} / {total} approved
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progressPct}%` }}
            data-done={allDone}
          />
        </div>
      </div>

      <div className="resume-lines">
        {groupBySection(lines).map(([section, sectionLines]) => (
          <div key={section} className="resume-section">
            <h3 className="resume-section-title">{section}</h3>
            {sectionLines.map(line => (
              <ResumeLineCard
                key={line.id}
                line={line}
                onApprove={onApprove}
                onSave={onSave}
                onHoverStart={(l) => onLineHover(l)}
                onHoverEnd={() => onLineHover(null)}
              />
            ))}
          </div>
        ))}
      </div>

    </div>
  )
}
