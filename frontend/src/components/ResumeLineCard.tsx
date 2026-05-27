// ResumeLineCard.tsx — a single resume line with edit/approve controls.
//
// Hover triggers onHoverStart/onHoverEnd in the parent chain, which
// ultimately tells the left two columns what text to highlight.
//
// Local state only:
//   isEditing / draftText — edit-in-place flow

import { useState } from 'react'
import type { ResumeLineItem } from '../types'

type Props = {
  line:         ResumeLineItem
  onApprove:    (id: string) => void
  onSave:       (id: string, newText: string) => void
  onHoverStart: (line: ResumeLineItem) => void
  onHoverEnd:   () => void
}

export function ResumeLineCard({ line, onApprove, onSave, onHoverStart, onHoverEnd }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState(line.text)

  function handleEdit() {
    setDraftText(line.text)
    setIsEditing(true)
  }

  function handleCancel() {
    setDraftText(line.text)
    setIsEditing(false)
  }

  function handleSave() {
    if (draftText.trim() && draftText !== line.text) {
      onSave(line.id, draftText.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      className="line-card"
      data-approved={line.approved}
      data-editing={isEditing}
      onMouseEnter={() => !isEditing && onHoverStart(line)}
      onMouseLeave={() => !isEditing && onHoverEnd()}
    >
      {/* Text or edit textarea */}
      {isEditing ? (
        <textarea
          className="line-edit-textarea"
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
          autoFocus
          rows={Math.max(2, Math.ceil(draftText.length / 68))}
        />
      ) : (
        <p className="line-text">{line.text}</p>
      )}

      {/* Actions */}
      <div className="line-actions">
        {isEditing ? (
          <>
            <button className="line-btn line-btn--ghost" onClick={handleCancel}>
              Cancel
            </button>
            <button
              className="line-btn line-btn--save"
              onClick={handleSave}
              disabled={!draftText.trim()}
            >
              Save
            </button>
          </>
        ) : (
          <>
            {line.edited && <span className="edited-mark" title="You edited this line">✎</span>}
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
