// FloatingPanel.tsx — reusable FB/LinkedIn-style floating launcher + panel.
//
// Usage:
//   <FloatingPanel label="🐛" title="Debug">
//     <DebugPanel stages={debugData} />
//   </FloatingPanel>
//
// The launcher button appears fixed bottom-right. Clicking it toggles the panel.
// The panel slides up from the bottom-right corner. Clicking X or the launcher
// again closes it.

import { useState, useRef, useEffect } from 'react'

type Props = {
  label:    string          // short text/emoji for the launcher button
  title:    string          // panel header text
  children: React.ReactNode
}

export function FloatingPanel({ label, title, children }: Props) {
  const [open, setOpen]     = useState(false)
  const panelRef            = useRef<HTMLDivElement>(null)

  // Close panel on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* Launcher button — always visible */}
      <button
        className="floating-launcher"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? `Close ${title}` : `Open ${title}`}
        aria-expanded={open}
      >
        {open ? '✕' : label}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="floating-panel"
          ref={panelRef}
          role="dialog"
          aria-label={title}
        >
          <div className="floating-panel-header">
            <span className="floating-panel-title">{title}</span>
            <button
              className="floating-panel-close"
              onClick={() => setOpen(false)}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <div className="floating-panel-body">
            {children}
          </div>
        </div>
      )}
    </>
  )
}
