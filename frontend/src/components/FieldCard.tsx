// FieldCard.tsx — one editable field box.
//
// Approve action has been removed from this component — approval now happens
// at the section level (SectionBlock in ResumeColumn). This card only handles
// click-to-edit and displays the approved/locked state driven by field.approved.
//
// Empty fields (text === '') are never rendered — the caller in ResumeColumn
// skips them. This component therefore always receives a non-empty field.
//
// Interaction:
//   Resting  — clean card, hover shows pencil
//   Click    — textarea opens (only if not approved)
//   Blur     — auto-save if text changed
//   Escape   — revert
//   Enter    — commit (single-line fields only; multiline allows Enter)

import { useState, useRef, useEffect } from 'react'
import type { UIField } from '../types'

type Props = {
  field:         UIField
  label:         string
  multiline?:    boolean   // true → Enter inserts newline; display uses white-space: pre-line
  bulletPoints?: boolean   // split on \n and render each segment as a bullet <li>
  textPrefix?:   string    // display-only prefix prepended to field.text (not stored)
  onSave:        (id: string, newText: string) => void
  onHoverStart:  (field: UIField) => void
  onHoverEnd:    () => void
}

export function FieldCard({
  field, label, multiline = false, bulletPoints = false, textPrefix,
  onSave, onHoverStart, onHoverEnd,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState(field.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isEditing || !textareaRef.current) return
    const el = textareaRef.current
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
    el.focus()
    el.selectionStart = el.selectionEnd = el.value.length
  }, [isEditing])

  function startEditing() {
    setDraftText(field.text)
    setIsEditing(true)
  }

  function commitEdit() {
    const trimmed = draftText.trim()
    if (trimmed !== field.text) onSave(field.id, trimmed)
    setIsEditing(false)
  }

  function cancelEdit() {
    setDraftText(field.text)
    setIsEditing(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraftText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // bulletPoints implies multiline: Enter should insert a newline, not commit.
  const isMultiline = multiline || bulletPoints

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); return }
    if (e.key === 'Enter' && !e.shiftKey && !isMultiline) {
      e.preventDefault()
      commitEdit()
    }
  }

  return (
    <div
      className="line-card"
      data-approved={field.approved}
      data-editing={isEditing}
      onMouseEnter={() => !isEditing && onHoverStart(field)}
      onMouseLeave={() => !isEditing && onHoverEnd()}
      onClick={() => !isEditing && !field.approved && startEditing()}
    >
      {/* Label row — label + optional edited indicator */}
      <div className="field-card-label-row">
        <span className="field-label">{label}</span>
        {field.edited && !isEditing && (
          <span className="edited-mark" title="You edited this field">✎</span>
        )}
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="line-inline-textarea"
          value={draftText}
          onChange={handleChange}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
      ) : bulletPoints ? (
        <ul className="line-bullet-list">
          {field.text.split('\n').filter(line => line.trim() !== '').map((line, i) => (
            <li key={i} className="line-text">{line}</li>
          ))}
        </ul>
      ) : (
        <p
          className="line-text"
          style={multiline ? { whiteSpace: 'pre-line' } : undefined}
        >
          {textPrefix}{field.text}
        </p>
      )}
    </div>
  )
}
