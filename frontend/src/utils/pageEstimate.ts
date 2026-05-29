// pageEstimate.ts — real-time estimate of how many pages the approved fields will fill.
//
// No LLM call, no backend — pure arithmetic on character counts.
// Calibrated for Calibri 11pt, 1-inch margins, US Letter.

import type { UIResumeData, UIField } from '../types'

const CHARS_PER_LINE   = 65   // approx chars per text line
const LINES_PER_PAGE   = 40   // text lines per page, accounting for headers + spacing
const NAME_BLOCK_LINES = 4    // name + contact + links + horizontal rule

export function computePageEstimate(data: UIResumeData): number {
  // Collect all approved, non-empty fields
  const approvedFields: UIField[] = []

  const collect = (f: UIField) => { if (f.approved && f.text.trim()) approvedFields.push(f) }

  Object.values(data.personalDetails).forEach(f => collect(f as UIField))
  collect(data.summary)
  data.experience.forEach(e => { collect(e.title); collect(e.organization); collect(e.dates); collect(e.description) })
  data.education.forEach(e => { collect(e.degree); collect(e.institution); collect(e.dates); collect(e.advisor); collect(e.details) })
  data.research.forEach(collect)
  data.skills.forEach(collect)
  data.additional.forEach(collect)

  if (approvedFields.length === 0) return 0

  const totalChars = approvedFields.reduce((sum, f) => sum + f.text.length, 0)

  // Count distinct sections that have at least one approved field
  const sections = new Set<string>()
  const pd = data.personalDetails
  if ([pd.name, pd.email, pd.phone, pd.location, pd.website, pd.linkedin, pd.github, pd.googleScholar].some(f => f.approved && f.text.trim())) sections.add('personalDetails')
  if (data.summary.approved && data.summary.text.trim()) sections.add('summary')
  if (data.experience.some(e => [e.title, e.organization, e.dates, e.description].some(f => f.approved && f.text.trim()))) sections.add('experience')
  if (data.education.some(e => [e.degree, e.institution, e.dates, e.advisor, e.details].some(f => f.approved && f.text.trim()))) sections.add('education')
  if (data.research.some(f => f.approved && f.text.trim()))  sections.add('research')
  if (data.skills.some(f => f.approved && f.text.trim()))    sections.add('skills')
  data.additional.forEach(f => { if (f.approved && f.text.trim()) sections.add(`additional-${f.section}`) })

  const estimatedLines = (totalChars / CHARS_PER_LINE) + sections.size + NAME_BLOCK_LINES
  return estimatedLines / LINES_PER_PAGE
}
