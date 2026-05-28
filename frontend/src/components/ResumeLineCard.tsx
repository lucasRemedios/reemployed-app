// ResumeLineCard.tsx
//
// Interaction model:
//   Resting  — clean card, only Approve button visible
//   Hover    — subtle background shift, faint pencil icon top-right
//   Click    — text becomes an inline textarea (same font/size/padding, no jump)
//   Blur     — auto-save if text changed, return to display mode
//   Escape   — revert without saving

import { useState, useRef, useEffect } from 'react'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // When edit mode activates: size the textarea to match the text height,
  // focus it, and place the cursor at the end.
  useEffect(() => {
    if (!isEditing || !textareaRef.current) return
    const el = textareaRef.current
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
    el.focus()
    el.selectionStart = el.selectionEnd = el.value.length
  }, [isEditing])

  function startEditing() {
    setDraftText(line.text)
    setIsEditing(true)
  }

  function commitEdit() {
    const trimmed = draftText.trim()
    if (trimmed && trimmed !== line.text) {
      onSave(line.id, trimmed)
    }
    setIsEditing(false)
  }

  function cancelEdit() {
    setDraftText(line.text)
    setIsEditing(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraftText(e.target.value)
    // Auto-resize to content height so there is no scrollbar inside the card
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
    // Enter (without Shift) commits — resume lines are single paragraphs
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitEdit()
    }
  }

  return (
    <div
      className="line-card"
      data-approved={line.approved}
      data-editing={isEditing}
      onMouseEnter={() => !isEditing && onHoverStart(line)}
      onMouseLeave={() => !isEditing && onHoverEnd()}
      onClick={() => !isEditing && startEditing()}
    >
      {/* Pencil affordance — invisible at rest, fades in on hover */}
      <span className="pencil-icon" aria-hidden="true">✎</span>

      {/* Text area — clicking anywhere on the card activates edit (onClick on card div).
          The <p> has no onClick of its own; it just displays the text. */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="line-inline-textarea"
          value={draftText}
          onChange={handleChange}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <p className="line-text">
          {line.text}
        </p>
      )}

      {/* Actions — Approve always present; edited mark when applicable */}
      <div className="line-actions">
        {line.edited && !isEditing && (
          <span className="edited-mark" title="You edited this line">✎</span>
        )}
        <button
          className="line-btn line-btn--approve"
          data-approved={line.approved}
          onClick={(e) => { e.stopPropagation(); onApprove(line.id) }}
        >
          {line.approved ? '✓ Approved' : 'Approve'}
        </button>
      </div>
    </div>
  )
}
