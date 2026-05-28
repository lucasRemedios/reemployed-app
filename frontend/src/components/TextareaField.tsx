// TextareaField.tsx
//
// The highlight is driven by a ref-based imperative API, not by props.
//
// WHY: hover events fire constantly. If we stored highlightText in React
// state, every hover would re-render App → re-render both TextareaFields →
// rebuild dangerouslySetInnerHTML → reflow text. That's the bug we're fixing.
//
// HOW: we expose setHighlight() via useImperativeHandle. The parent calls it
// directly through a ref — no state change, no re-render, pure DOM mutation.
//
// Public API (TextareaFieldHandle):
//   setHighlight(text: string | null) — show/clear highlight. Call freely.

import { forwardRef, useImperativeHandle, useRef } from 'react'
import { findAllMatches } from '../utils/matchText'
import type { TextSpan } from '../utils/matchText'

export interface TextareaFieldHandle {
  setHighlight: (references: string[] | null) => void
}

type TextareaFieldProps = {
  label:            string
  hint:             string
  value:            string
  onChange:         (value: string) => void
  placeholder:      string
  maxWords:         number
  highlightVariant: 'posting' | 'background'
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

// Strip characters that cause backdrop/textarea rendering differences.
// Called on paste so the text is clean from the moment it enters the field.
//   - Tabs → two spaces (tab-width differs between div and textarea)
//   - Windows/old-Mac line endings → \n
//   - Non-breaking spaces → regular spaces
//   - Zero-width characters (invisible, but can affect layout) → removed
function cleanPastedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')          // Windows line endings
    .replace(/\r/g, '\n')            // old Mac line endings
    .replace(/\t/g, '  ')            // tabs → two spaces
    .replace(/ /g, ' ')         // non-breaking space → space
    .replace(/[​-‍﻿]/g, '') // zero-width characters → gone
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Build backdrop HTML with a <mark> around each span.
// Spans must already be sorted and non-overlapping (use mergeSpans first).
function buildMultiHighlightHtml(text: string, spans: TextSpan[], variant: string): string {
  if (spans.length === 0) return escapeHtml(text)
  let html = ''
  let pos  = 0
  for (const { start, end } of spans) {
    html += escapeHtml(text.slice(pos, start))
    html += `<mark class="text-highlight text-highlight--${variant}">`
    html += escapeHtml(text.slice(start, end))
    html += '</mark>'
    pos   = end
  }
  html += escapeHtml(text.slice(pos))
  return html
}

export const TextareaField = forwardRef<TextareaFieldHandle, TextareaFieldProps>(
  function TextareaField(
    { label, hint, value, onChange, placeholder, maxWords, highlightVariant },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)

    // We keep a ref to the current value so setHighlight() can read it
    // without being inside the render closure (avoids stale closures).
    // This ref is updated on every render, but that's just a ref assignment —
    // no DOM work, no reflow.
    const valueRef = useRef(value)
    valueRef.current = value

    // ── Imperative highlight API ─────────────────────────────────────────────
    // Called by the parent directly via ref — never causes a re-render here.
    useImperativeHandle(ref, () => ({
      setHighlight(references: string[] | null) {
        const textarea = textareaRef.current
        const backdrop = backdropRef.current
        if (!textarea || !backdrop) return

        if (!references || references.length === 0) {
          backdrop.style.visibility = 'hidden'
          textarea.style.color = ''
          return
        }

        // Find the best-matching span for every reference, merge overlaps
        const spans = findAllMatches(valueRef.current, references)
        if (spans.length === 0) {
          backdrop.style.visibility = 'hidden'
          textarea.style.color = ''
          return
        }

        backdrop.innerHTML = buildMultiHighlightHtml(valueRef.current, spans, highlightVariant)
        backdrop.style.visibility = 'visible'
        textarea.style.color = 'transparent'

        // Scroll to the first highlight
        requestAnimationFrame(() => {
          const firstMark = backdrop.querySelector('mark') as HTMLElement | null
          if (!firstMark) return
          const scrollTo = Math.max(
            0,
            firstMark.offsetTop - backdrop.clientHeight / 2 + firstMark.offsetHeight / 2,
          )
          backdrop.scrollTop = scrollTo
          textarea.scrollTop = scrollTo
        })
      },
    }), [highlightVariant])

    // Keep backdrop scroll in sync when user scrolls the textarea manually
    function handleScroll() {
      if (backdropRef.current && textareaRef.current) {
        backdropRef.current.scrollTop = textareaRef.current.scrollTop
      }
    }

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      const next = e.target.value
      if (countWords(next) <= maxWords || next.length < value.length) {
        onChange(next)
      }
    }

    // Intercept paste to strip characters that cause backdrop/textarea
    // rendering differences (tabs, non-breaking spaces, zero-width chars).
    function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
      e.preventDefault()
      const raw     = e.clipboardData.getData('text/plain')
      const cleaned = cleanPastedText(raw)
      const el      = e.currentTarget
      const start   = el.selectionStart ?? 0
      const end     = el.selectionEnd   ?? 0
      const next    = value.slice(0, start) + cleaned + value.slice(end)
      if (countWords(next) <= maxWords) {
        onChange(next)
        // Restore cursor position after React re-renders the new value
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + cleaned.length
        })
      }
    }

    const wordCount   = countWords(value)
    const remaining   = maxWords - wordCount
    const isNearLimit = remaining < maxWords * 0.1
    const isAtLimit   = remaining <= 0

    return (
      <div className="textarea-field">
        <div className="textarea-header">
          <div>
            <h2 className="column-label">{label}</h2>
            <p className="column-hint">{hint}</p>
          </div>
          <span
            className="char-counter"
            data-near={isNearLimit}
            data-over={isAtLimit}
          >
            {wordCount.toLocaleString()} / {maxWords.toLocaleString()} words
          </span>
        </div>

        <div className="textarea-wrapper">
          {/* Backdrop: starts hidden, shown only during highlights.
              No React-managed children — we write innerHTML directly via ref.
              React will not interfere with it. */}
          <div
            ref={backdropRef}
            className="textarea-backdrop"
            aria-hidden="true"
            style={{ visibility: 'hidden' }}
          />
          <textarea
            ref={textareaRef}
            className="textarea"
            value={value}
            onChange={handleChange}
            onScroll={handleScroll}
            onPaste={handlePaste}
            placeholder={placeholder}
            spellCheck={true}
            // No `style` prop here — so React will never reset the
            // color:transparent we set imperatively in setHighlight()
          />
        </div>
      </div>
    )
  },
)
