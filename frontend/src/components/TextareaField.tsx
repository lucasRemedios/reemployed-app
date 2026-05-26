// TextareaField.tsx — a labeled textarea with a live character counter.
//
// This is a "controlled component" in React: the parent (App.tsx) owns the
// value in its state. This component just displays it and calls onChange
// when the user types. It never owns or mutates the data itself.
//
// Props:
//   label       — column heading text
//   hint        — smaller subtext below the label
//   value       — current text (controlled by parent)
//   onChange    — callback the parent provides to update its state
//   placeholder — greyed-out text shown when the field is empty
//   maxChars    — character limit; counter turns red when close

type TextareaFieldProps = {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  maxChars: number
}

export function TextareaField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxChars,
}: TextareaFieldProps) {
  const remaining = maxChars - value.length
  const isNearLimit = remaining < maxChars * 0.1  // within 10% of limit
  const isAtLimit   = remaining <= 0

  return (
    <div className="textarea-field">
      {/* Column header */}
      <div className="textarea-header">
        <div>
          <h2 className="column-label">{label}</h2>
          <p className="column-hint">{hint}</p>
        </div>
        {/* Character counter — colour shifts as limit approaches */}
        <span
          className="char-counter"
          data-near={isNearLimit}
          data-over={isAtLimit}
        >
          {value.length.toLocaleString()} / {maxChars.toLocaleString()}
        </span>
      </div>

      {/* The textarea itself */}
      <textarea
        className="textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxChars}
        spellCheck={true}
      />
    </div>
  )
}
