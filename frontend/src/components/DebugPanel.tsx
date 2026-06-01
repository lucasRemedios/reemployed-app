// DebugPanel.tsx — renders the raw LLM transcript for each stage.
//
// Each stage card shows:
//   • A small header: model · latency · token counts
//   • Collapsible sections: System Prompt / Input / Raw Response / Parsed Result
//   • Copy-to-clipboard button on every section
//
// This is a pure display component — all data comes from the API response when
// ?debug=1 is appended to the fetch URL.

import { useState } from 'react'
import type { StageDebugInfo } from '../types'

// ── Copy-to-clipboard button ───────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable (insecure context)
    }
  }

  return (
    <button className="debug-copy-btn" onClick={handleCopy} aria-label="Copy to clipboard">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// ── Collapsible section ────────────────────────────────────────────────────

function Section({
  heading,
  content,
  defaultOpen = false,
}: {
  heading:     string
  content:     string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="debug-section">
      <button
        className="debug-section-toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="debug-section-arrow">{open ? '▾' : '▸'}</span>
        {heading}
        <CopyButton text={content} />
      </button>
      {open && (
        <pre className="debug-section-body">{content}</pre>
      )}
    </div>
  )
}

// ── Stage card ─────────────────────────────────────────────────────────────

function StageCard({ info }: { info: StageDebugInfo }) {
  const tokens = info.tokenUsage
  const parsedText = info.parseError
    ? `Parse error: ${info.parseError}`
    : JSON.stringify(info.parsedResponse, null, 2)

  return (
    <div className="debug-stage-card">
      {/* Header row */}
      <div className="debug-stage-header">
        <span className="debug-stage-badge">Stage {info.stage}</span>
        <span className="debug-stage-meta">{info.model}</span>
        <span className="debug-stage-meta">{info.latencyMs.toLocaleString()} ms</span>
        {tokens && (
          <span className="debug-stage-meta">
            {tokens.promptTokens.toLocaleString()} + {tokens.completionTokens.toLocaleString()} = {tokens.totalTokens.toLocaleString()} tok
          </span>
        )}
      </div>

      {/* Collapsible sections */}
      <Section heading="System Prompt"  content={info.systemPrompt}  defaultOpen={false} />
      <Section heading="Input"          content={info.userMessage}   defaultOpen={false} />
      <Section heading="Raw Response"   content={info.rawResponse}   defaultOpen={true}  />
      <Section heading="Parsed Result"  content={parsedText}         defaultOpen={false} />
    </div>
  )
}

// ── Public component ────────────────────────────────────────────────────────

export function DebugPanel({ stages }: { stages: StageDebugInfo[] }) {
  if (stages.length === 0) {
    return <p className="debug-empty">No debug data.</p>
  }

  // Sort Stage 1 before Stage 2 just in case
  const sorted = [...stages].sort((a, b) => a.stage - b.stage)

  return (
    <div className="debug-panel-content">
      {sorted.map(s => (
        <StageCard key={s.stage} info={s} />
      ))}
    </div>
  )
}
