// ResumeLineCard.tsx — one resume line with edit, approve, and reference controls.
//
// State that lives HERE (local, not shared):
//   expandedRef  — which reference panel is open ('posting' | 'background' | null)
//   isEditing    — whether the text is in edit mode
//   draftText    — the in-progress edit (discarded on Cancel, committed on Save)
//
// State that lives in APP (shared, passed down as props):
//   line         — the ResumeLineItem data (text, references, approved, edited)
//   onApprove    — toggles line.approved
//   onSave       — commits an edited text, sets line.edited = true

import { useState } from 'react'
import type { ResumeLineItem } from '../types'

type ResumeLineCardProps = {
  line: ResumeLineItem
  onApprove: (id: string) => void
  onSave:    (id: string, newText: string) => void
}

type ExpandedRef = 'posting' | 'background' | null

export function ResumeLineCard({ line, onApprove, onSave }: ResumeLineCardProps) {
  const [expandedRef, setExpandedRef] = useState<ExpandedRef>(null)
  const [isEditing,   setIsEditing]   = useState(false)
  const [draftText,   setDraftText]   = useState(line.text)

  // Toggle a reference panel: clicking the same chip twice closes it.
  function toggleRef(ref: 'posting' | 'background') {
    setExpandedRef(prev => (prev === ref ? null : ref))
  }

  function handleEdit() {
    setDraftText(line.text)   // always start from the current saved text
    setIsEditing(true)
  }

  function handleCancel() {
    setDraftText(line.text)   // discard changes
    setIsEditing(false)
  }

  function handleSave() {
    if (draftText.trim() !== '' && draftText !== line.text) {
      onSave(line.id, draftText.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      className="line-card"
      data-approved={line.approved}
      data-editing={isEditing}
    >
      {/* ── Status badges ──────────────────────────────────────────────── */}
      <div className="line-badges">
        {line.approved && <span className="badge badge--approved">✓ Approved</span>}
        {line.edited   && <span className="badge badge--edited">✎ Edited</span>}
      </div>

      {/* ── Line text / edit textarea ──────────────────────────────────── */}
      {isEditing ? (
        <textarea
          className="line-edit-textarea"
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
          autoFocus
          rows={Math.max(3, Math.ceil(draftText.length / 72))}
        />
      ) : (
        <p className="line-text">{line.text}</p>
      )}

      {/* ── Reference chips ────────────────────────────────────────────── */}
      {!isEditing && (
        <div className="ref-chips">
          <button
            className="ref-chip ref-chip--posting"
            data-active={expandedRef === 'posting'}
            onClick={() => toggleRef('posting')}
            title="Show job posting reference"
          >
            ⌖ Posting {expandedRef === 'posting' ? '▴' : '▾'}
          </button>
          <button
            className="ref-chip ref-chip--background"
            data-active={expandedRef === 'background'}
            onClick={() => toggleRef('background')}
            title="Show background reference"
          >
            ◈ Background {expandedRef === 'background' ? '▴' : '▾'}
          </button>
        </div>
      )}

      {/* ── Expanded reference panel ───────────────────────────────────── */}
      {!isEditing && expandedRef === 'posting' && (
        <div className="ref-panel ref-panel--posting">
          <span className="ref-panel-label">From job posting</span>
          <p className="ref-panel-text">{line.postingReference}</p>
        </div>
      )}
      {!isEditing && expandedRef === 'background' && (
        <div className="ref-panel ref-panel--background">
          <span className="ref-panel-label">From your background</span>
          <p className="ref-panel-text">{line.backgroundReference}</p>
        </div>
      )}

      {/* ── Action row ─────────────────────────────────────────────────── */}
      <div className="line-actions">
        {isEditing ? (
          <>
            <button className="line-btn line-btn--ghost" onClick={handleCancel}>
              Cancel
            </button>
            <button
              className="line-btn line-btn--save"
              onClick={handleSave}
              disabled={draftText.trim() === ''}
            >
              Save
            </button>
          </>
        ) : (
          <>
            <button className="line-btn line-btn--ghost" onClick={handleEdit}>
              Edit
            </button>
            <button
              className="line-btn line-btn--approve"
              data-approved={line.approved}
              onClick={() => onApprove(line.id)}
            >
              {line.approved ? '✓ Approved' : 'Approve'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
