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

export interface TextareaFieldHandle {
  setHighlight: (text: string | null) => void
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

function buildHighlightedHtml(text: string, highlight: string, variant: string): string {
  const idx = text.indexOf(highlight)
  if (idx === -1) return escapeHtml(text)
  return (
    escapeHtml(text.slice(0, idx)) +
    `<mark class="text-highlight text-highlight--${variant}">` +
    escapeHtml(highlight) +
    '</mark>' +
    escapeHtml(text.slice(idx + highlight.length))
  )
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
      setHighlight(text: string | null) {
        const textarea = textareaRef.current
        const backdrop = backdropRef.current
        if (!textarea || !backdrop) return

        if (!text) {
          // Clear: hide backdrop, restore textarea text colour
          backdrop.style.visibility = 'hidden'
          textarea.style.color = ''
          return
        }

        // Build the highlighted HTML and push it directly into the DOM.
        // React never touches this div's innerHTML (no dangerouslySetInnerHTML,
        // no JSX children), so there is no conflict.
        backdrop.innerHTML = buildHighlightedHtml(valueRef.current, text, highlightVariant)
        backdrop.style.visibility = 'visible'
        // Make textarea text transparent so the styled backdrop shows through.
        // React won't reset this because the JSX has no `style` prop on textarea.
        textarea.style.color = 'transparent'

        // Scroll to center the highlighted excerpt
        requestAnimationFrame(() => {
          const mark = backdrop.querySelector('mark')
          if (!mark) return
          const scrollTo = Math.max(
            0,
            (mark as HTMLElement).offsetTop -
              backdrop.clientHeight / 2 +
              (mark as HTMLElement).offsetHeight / 2,
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
