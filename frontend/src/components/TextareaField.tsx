// TextareaField.tsx — a labeled textarea with a live word counter.
//
// Word count is computed by splitting on whitespace and filtering empty tokens.
// The limit is enforced by blocking onChange once the word count hits maxWords,
// which prevents both typing and pasting past the limit.

type TextareaFieldProps = {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  maxWords: number
}

// Count whitespace-separated words. Empty string → 0.
function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export function TextareaField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxWords,
}: TextareaFieldProps) {
  const wordCount   = countWords(value)
  const remaining   = maxWords - wordCount
  const isNearLimit = remaining < maxWords * 0.1  // within 10% of limit
  const isAtLimit   = remaining <= 0

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value
    // Allow the change only if it stays within the word limit.
    // Exception: allow deletions even if currently over (so user can fix it).
    if (countWords(next) <= maxWords || next.length < value.length) {
      onChange(next)
    }
  }

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

      <textarea
        className="textarea"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        spellCheck={true}
      />
    </div>
  )
}
