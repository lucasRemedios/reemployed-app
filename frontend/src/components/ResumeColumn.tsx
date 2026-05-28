// ResumeColumn.tsx — right column: progress bar + grouped line cards.
//
// Header layout contract:
//   Left:  "TAILORED RESUME" — flex-shrink: 0, always left-aligned, never moves
//   Right: "X / Y approved · [estimate]" — flex: 1, overflow hidden, white-space: nowrap
//          Never wraps. If estimate text is long it clips rather than pushing the left label.
//   Below header row: progress bar (colour matches estimate state)
//   Below progress bar: optional status message (separate line, small, muted)

import type { ResumeLineItem } from '../types'
import { ResumeLineCard } from './ResumeLineCard'

type Props = {
  lines:          ResumeLineItem[]
  estimatedPages: number            // 0 when nothing approved yet
  onApprove:      (id: string) => void
  onSave:         (id: string, newText: string) => void
  onLineHover:    (line: ResumeLineItem | null) => void
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

// ── Page estimate formatting ──────────────────────────────────────────────────

type EstimateInfo = {
  text:      string        // inline text shown below the counter, or '' if nothing approved
  barColor:  string        // CSS colour for the progress bar fill only
  statusMsg: string | null // separate line below the progress bar, or null
}

const GREEN     = 'var(--c-accent)'
const AMBER_BAR = '#F59E0B'
const RED       = '#EF4444'

function getEstimateInfo(pages: number, approvedCount: number): EstimateInfo {
  if (approvedCount === 0 || pages <= 0) {
    return { text: '', barColor: GREEN, statusMsg: null }
  }
  if (pages < 0.95) {
    return {
      text:      `about ${Math.round(pages * 100)}% of a page`,
      barColor:  AMBER_BAR,
      statusMsg: 'Room to add more detail',
    }
  }
  if (pages <= 1.05) {
    return {
      text:      'about 1 page ✓',
      barColor:  GREEN,
      statusMsg: null,
    }
  }
  if (pages <= 1.5) {
    return {
      text:      `about ${pages.toFixed(1)} pages — trim a few lines`,
      barColor:  AMBER_BAR,
      statusMsg: null,
    }
  }
  return {
    text:      `about ${Math.round(pages)} pages — consider cutting content`,
    barColor:  RED,
    statusMsg: null,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResumeColumn({ lines, estimatedPages, onApprove, onSave, onLineHover }: Props) {

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

  const { text: estimateText, barColor: estimateBarColor, statusMsg } =
    getEstimateInfo(estimatedPages, approvedCount)

  return (
    <div className="resume-column">

      <div className="resume-header">

        {/* ── Single stable flex row ─────────────────────────────────────────
            Left label: flex-shrink: 0 — never moves, never shrinks.
            Right group: flex: 1, min-width: 0, overflow: hidden — fills the
            remaining space and clips rather than wrapping or pushing left. */}
        <div className="resume-header-top">
          <h2 className="column-label">Tailored Resume</h2>

          <div className="resume-header-right">
            <span className="progress-label" data-done={allDone}>
              {approvedCount} / {total} approved
            </span>
            {estimateText && (
              <span className="page-estimate-inline">
                {estimateText}
              </span>
            )}
          </div>
        </div>

        {/* ── Progress bar — colour tracks estimate state ────────────────── */}
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progressPct}%`, background: estimateBarColor }}
          />
        </div>

        {/* ── Status message — separate line, never on the header row ───── */}
        {statusMsg && (
          <p className="page-status-msg">{statusMsg}</p>
        )}

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
