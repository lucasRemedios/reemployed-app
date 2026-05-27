// TextareaField.tsx — labeled textarea with a highlight overlay.
//
// How the highlight works:
//   1. A <div> (the "backdrop") sits behind the <textarea> with identical
//      font, size, and padding.
//   2. When `highlightText` is set, the backdrop renders the full text with
//      a <mark> around the matched excerpt.
//   3. The textarea becomes color:transparent so the styled backdrop shows
//      through. The caret stays visible via caret-color.
//   4. On highlight change, we scroll both backdrop and textarea to center
//      the highlighted excerpt in view.
//
// The `highlightVariant` prop controls the highlight colour:
//   'posting'    → warm amber  (left column)
//   'background' → soft indigo (middle column)

import { useRef, useEffect } from 'react'

type TextareaFieldProps = {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  maxWords: number
  highlightText?: string
  highlightVariant?: 'posting' | 'background'
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

// Escape HTML entities so user text can safely go into dangerouslySetInnerHTML.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Build the backdrop innerHTML: plain escaped text, with one <mark> around
// the first occurrence of `highlight` (if found).
function buildBackdropHtml(text: string, highlight: string | undefined, variant: string): string {
  const escaped = escapeHtml(text)
  if (!highlight) return escaped

  const idx = text.indexOf(highlight)
  if (idx === -1) return escaped

  const before = escapeHtml(text.slice(0, idx))
  const match  = escapeHtml(highlight)
  const after  = escapeHtml(text.slice(idx + highlight.length))

  return `${before}<mark class="text-highlight text-highlight--${variant}">${match}</mark>${after}`
}

export function TextareaField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxWords,
  highlightText,
  highlightVariant = 'posting',
}: TextareaFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const wordCount    = countWords(value)
  const remaining    = maxWords - wordCount
  const isNearLimit  = remaining < maxWords * 0.1
  const isAtLimit    = remaining <= 0
  const isHighlighting = !!highlightText

  // When the highlight changes, scroll both layers to center the <mark>.
  useEffect(() => {
    if (!backdropRef.current || !textareaRef.current) return

    if (!highlightText) return

    // Wait one frame for the DOM to render the <mark> element.
    requestAnimationFrame(() => {
      const mark = backdropRef.current?.querySelector('mark')
      if (!mark || !backdropRef.current || !textareaRef.current) return

      const containerH = backdropRef.current.clientHeight
      const scrollTo   = Math.max(
        0,
        (mark as HTMLElement).offsetTop - containerH / 2 + (mark as HTMLElement).offsetHeight / 2
      )

      backdropRef.current.scrollTop  = scrollTo
      textareaRef.current.scrollTop  = scrollTo
    })
  }, [highlightText])

  // Keep backdrop and textarea scroll positions in sync during manual scrolling.
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

  const backdropHtml = buildBackdropHtml(value, highlightText, highlightVariant)

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

      {/* Wrapper: contains backdrop + textarea stacked on top of each other */}
      <div className="textarea-wrapper">
        <div
          ref={backdropRef}
          className="textarea-backdrop"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: backdropHtml }}
        />
        <textarea
          ref={textareaRef}
          className="textarea"
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          placeholder={placeholder}
          spellCheck={true}
          // Make textarea text transparent when a highlight is active so the
          // styled backdrop shows through. The caret stays visible.
          style={{ color: isHighlighting ? 'transparent' : undefined }}
        />
      </div>

    </div>
  )
}
