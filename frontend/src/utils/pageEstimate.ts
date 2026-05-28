// pageEstimate.ts — real-time estimate of how many pages the approved lines will fill.
//
// No LLM call, no backend needed — pure arithmetic based on character counts.
// The constants below are calibrated for Calibri 11pt with 1-inch margins (US Letter).

import type { ResumeLineItem } from '../types'

const CHARS_PER_LINE   = 65   // approx chars per text line: Calibri 11pt, 1-inch margins
const LINES_PER_PAGE   = 40   // text lines per page, accounting for section headers + spacing
const NAME_BLOCK_LINES = 4    // name + contact + links + horizontal rule

export function computePageEstimate(lines: ResumeLineItem[]): number {
  const approvedLines = lines.filter(l => l.approved)
  if (approvedLines.length === 0) return 0

  const totalChars     = approvedLines.reduce((sum, line) => sum + line.text.length, 0)
  const uniqueSections = new Set(approvedLines.map(l => l.section ?? 'Other')).size

  const estimatedLines = (totalChars / CHARS_PER_LINE) + uniqueSections + NAME_BLOCK_LINES
  return estimatedLines / LINES_PER_PAGE
}
