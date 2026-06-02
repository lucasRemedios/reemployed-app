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

  // Token budget string: "1,500 + 800 = 2,300 tok  (18% of 131,072 ctx)"
  const tokenBudget = (() => {
    if (!tokens) return null
    const { promptTokens: p, completionTokens: c, totalTokens: t } = tokens
    const base = `${p.toLocaleString()} + ${c.toLocaleString()} = ${t.toLocaleString()} tok`
    if (!info.contextWindow) return base
    const pct = Math.round(t / info.contextWindow * 100)
    return `${base}  (${pct}% of ${info.contextWindow.toLocaleString()} ctx)`
  })()

  return (
    <div className="debug-stage-card">
      {/* Parse-failed banner */}
      {info.parseError && (
        <div className="debug-parse-failed-banner">⚠ PARSE FAILED — {info.parseError}</div>
      )}

      {/* Header row */}
      <div className="debug-stage-header">
        <span className="debug-stage-badge">
          {info.stage === 'single' ? 'Single-Stage' : `Stage ${info.stage}`}
        </span>
        <span className="debug-stage-meta">{info.model}</span>
        <span className="debug-stage-meta">{info.latencyMs.toLocaleString()} ms</span>
        {tokenBudget && (
          <span className="debug-stage-meta">{tokenBudget}</span>
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

// ── Build a flat copy-all transcript ──────────────────────────────────────

function buildTranscript(stages: StageDebugInfo[]): string {
  return stages.map(s => {
    const tok = s.tokenUsage
      ? `${s.tokenUsage.promptTokens} + ${s.tokenUsage.completionTokens} = ${s.tokenUsage.totalTokens} tok`
      : 'tokens: unknown'
    const parsed = s.parseError
      ? `Parse error: ${s.parseError}`
      : JSON.stringify(s.parsedResponse, null, 2)
    return [
      `${'═'.repeat(60)}`,
      `STAGE ${s.stage}  |  ${s.model}  |  ${s.latencyMs} ms  |  ${tok}`,
      `${'═'.repeat(60)}`,
      `── SYSTEM PROMPT ──`,
      s.systemPrompt,
      `── INPUT ──`,
      s.userMessage,
      `── RAW RESPONSE ──`,
      s.rawResponse,
      `── PARSED RESULT ──`,
      parsed,
    ].join('\n\n')
  }).join('\n\n\n')
}

// ── Public component ────────────────────────────────────────────────────────

export function DebugPanel({ stages }: { stages: StageDebugInfo[] }) {
  const [copied, setCopied] = useState(false)

  if (stages.length === 0) {
    return <p className="debug-empty">No debug data.</p>
  }

  // Sort numeric stages before 'single'; within numeric, ascending.
  const stageOrder = (s: StageDebugInfo['stage']) => s === 'single' ? 99 : s
  const sorted = [...stages].sort((a, b) => stageOrder(a.stage) - stageOrder(b.stage))

  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(buildTranscript(sorted))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable (insecure context)
    }
  }

  return (
    <div className="debug-panel-content">
      <div className="debug-copy-all-row">
        <button className="debug-copy-all-btn" onClick={handleCopyAll}>
          {copied ? '✓ Copied everything' : 'Copy all'}
        </button>
      </div>
      {sorted.map(s => (
        <StageCard key={s.stage} info={s} />
      ))}
    </div>
  )
}
