// routes/export.ts — generates a .docx from structured resume data.
//
// Accepts the structured ExportBody (no longer a flat lines array).
// Personal details → document header; structured sections → body.
//
// Experience entries render as:
//   Bold header:  "Title · Organization · Dates"  (empty parts omitted)
//   Body bullets: description split on \n, leading bullet chars stripped
//
// Education entries render as:
//   Bold header:  "Degree · Institution · Dates"
//   Plain lines:  advisor, details (if non-empty)
//
// Font scaling, line spacing, and margin rules unchanged.

import { Request, Response } from 'express'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  LevelFormat,
  LineRuleType,
} from 'docx'

// ── Input shape ───────────────────────────────────────────────────────────────

type ExportPersonalDetails = {
  name: string; email: string; phone: string; location: string
  website: string; linkedin: string; github: string; googleScholar: string
}

type ExportExperienceEntry = {
  title: string; organization: string; dates: string; description: string
}

type ExportEducationEntry = {
  degree: string; institution: string; dates: string; advisor: string; details: string
}

type ExportBody = {
  personalDetails:  ExportPersonalDetails
  summary:          string
  experience:       ExportExperienceEntry[]
  education:        ExportEducationEntry[]
  research:         string[]
  skills:           string[]
  additional:       Array<{ section: string; text: string }>
  estimatedPages?:  number
}

function isExportBody(body: unknown): body is ExportBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.personalDetails === 'object' && b.personalDetails !== null &&
    typeof b.summary         === 'string' &&
    Array.isArray(b.experience) &&
    Array.isArray(b.education) &&
    Array.isArray(b.research) &&
    Array.isArray(b.skills) &&
    Array.isArray(b.additional)
  )
}

// ── Font / spacing constants ──────────────────────────────────────────────────

const BODY_FONT         = 'Calibri'
const BODY_SIZE_DEFAULT = 22    // 11pt in half-points
const BODY_SIZE_MIN     = 20    // 10pt floor
const LINE_SPACING      = 276   // 1.15 × 240 twips (lineRule=auto)
const BULLET_SPACING    = 40    // DXA after each bullet
const BODY_SPACING      = 60    // DXA between body lines
const SECTION_END       = 120   // DXA after last item in a section

// ── Utility ───────────────────────────────────────────────────────────────────

// Join non-empty parts with ' · '
function join(...parts: string[]): string {
  return parts.filter(s => s.trim()).join(' · ')
}

// Split a description block into individual lines, stripping leading bullet chars
function descriptionLines(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.replace(/^[\s•\-–*]+/, '').trim())
    .filter(line => line.length > 0)
}

// ── Paragraph helpers ─────────────────────────────────────────────────────────

function sectionHeader(title: string, size: number): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size, color: '2E2E2E', font: BODY_FONT })],
    spacing: { before: 240, after: 80 },
    // No border — vertical spacing alone separates sections
  })
}

// Entry header for Experience / Education — bold title + normal rest
function entryHeader(titleText: string, rest: string, size: number): Paragraph {
  const children: TextRun[] = [
    new TextRun({ text: titleText, bold: true, size, font: BODY_FONT }),
  ]
  if (rest) children.push(new TextRun({ text: ` · ${rest}`, size, font: BODY_FONT }))
  return new Paragraph({
    children,
    spacing: { line: LINE_SPACING, lineRule: LineRuleType.AUTO, after: 40 },
  })
}

function bodyParagraph(text: string, spacingAfter: number, size: number): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size, font: BODY_FONT })],
    spacing: { line: LINE_SPACING, lineRule: LineRuleType.AUTO, after: spacingAfter },
  })
}

function bulletParagraph(text: string, ref: string, size: number, spacingAfter: number): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size, font: BODY_FONT })],
    numbering: { reference: ref, level: 0 },
    spacing: { line: LINE_SPACING, lineRule: LineRuleType.AUTO, after: spacingAfter },
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function exportHandler(req: Request, res: Response): Promise<void> {
  if (!isExportBody(req.body)) {
    res.status(400).json({ error: 'Invalid export request body.' })
    return
  }

  const {
    personalDetails, summary, experience, education,
    research, skills, additional, estimatedPages,
  } = req.body

  // ── Font scaling ────────────────────────────────────────────────────────────
  let bodySize = BODY_SIZE_DEFAULT
  if (typeof estimatedPages === 'number' && estimatedPages > 1.05) {
    let scaled = estimatedPages
    while (bodySize > BODY_SIZE_MIN && scaled > 1.05) {
      bodySize--
      const r = bodySize / BODY_SIZE_DEFAULT
      scaled  = estimatedPages * r * r
    }
    console.log(`[export] Font scaled ${BODY_SIZE_DEFAULT / 2}pt → ${bodySize / 2}pt (estimate: ${estimatedPages.toFixed(2)})`)
  }

  // ── Determine bullet sections ───────────────────────────────────────────────
  // research + experience descriptions + additional bullet sections get numbering refs
  const bulletRefNames: string[] = []

  const expBulletRefs: string[] = []
  for (let i = 0; i < experience.length; i++) {
    const ref = `bullets-exp-${i}`
    expBulletRefs.push(ref)
    bulletRefNames.push(ref)
  }
  if (research.length > 0)  bulletRefNames.push('bullets-research')
  if (additional.length > 0) {
    const addSections = [...new Set(additional.map(a => a.section))]
    addSections.forEach(s => bulletRefNames.push(`bullets-add-${s.toLowerCase().replace(/\s+/g, '-')}`))
  }

  const numberingConfig = bulletRefNames.map(reference => ({
    reference,
    levels: [{
      level:     0,
      format:    LevelFormat.BULLET,
      text:      '•',
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360, hanging: 180 } } },
    }],
  }))

  // ── Build document header ───────────────────────────────────────────────────
  const children: Paragraph[] = []

  // Name
  if (personalDetails.name.trim()) {
    children.push(new Paragraph({
      children: [new TextRun({ text: personalDetails.name.trim(), bold: true, size: 36, font: BODY_FONT })],
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 40 },
    }))
  }

  // Contact line: email · phone · location
  const contactLine = join(personalDetails.email, personalDetails.phone, personalDetails.location)
  if (contactLine) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contactLine, size: 20, color: '666666', font: BODY_FONT })],
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 80 },
    }))
  }

  // Links line: website · linkedin · github · "Google Scholar: {value}"
  // Google Scholar may be a name or URL — always label it for clarity.
  const scholarFormatted = personalDetails.googleScholar.trim()
    ? `Google Scholar: ${personalDetails.googleScholar.trim()}`
    : ''
  const linksLine = join(personalDetails.website, personalDetails.linkedin, personalDetails.github, scholarFormatted)
  if (linksLine) {
    children.push(new Paragraph({
      children: [new TextRun({ text: linksLine, size: 20, color: '666666', font: BODY_FONT })],
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 240 },
    }))
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  if (summary.trim()) {
    children.push(sectionHeader('Summary', bodySize))
    children.push(bodyParagraph(summary.trim(), SECTION_END, bodySize))
  }

  // ── Experience ───────────────────────────────────────────────────────────────
  const nonEmptyExp = experience.filter(e =>
    e.title.trim() || e.organization.trim() || e.dates.trim() || e.description.trim()
  )
  if (nonEmptyExp.length > 0) {
    children.push(sectionHeader('Experience', bodySize))

    nonEmptyExp.forEach((e, i) => {
      const isLastEntry = i === nonEmptyExp.length - 1

      // Role header: "Title" bold + " · Organization · Dates" normal
      const headerTitle = e.title.trim()
      const headerRest  = join(e.organization, e.dates)
      if (headerTitle || headerRest) {
        children.push(entryHeader(headerTitle || headerRest, headerTitle ? headerRest : '', bodySize))
      }

      // Description bullets
      const lines = descriptionLines(e.description)
      const ref   = expBulletRefs[experience.indexOf(e)] ?? `bullets-exp-${i}`
      lines.forEach((line, li) => {
        const isLastLine = isLastEntry && li === lines.length - 1
        children.push(bulletParagraph(line, ref, bodySize, isLastLine ? SECTION_END : BULLET_SPACING))
      })

      // Gap between entries (not after last one — SECTION_END handled above)
      if (!isLastEntry) {
        children.push(new Paragraph({ children: [], spacing: { after: 80 } }))
      }
    })
  }

  // ── Education ────────────────────────────────────────────────────────────────
  const nonEmptyEdu = education.filter(e =>
    e.degree.trim() || e.institution.trim() || e.dates.trim()
  )
  if (nonEmptyEdu.length > 0) {
    children.push(sectionHeader('Education', bodySize))

    nonEmptyEdu.forEach((e, i) => {
      const isLastEntry = i === nonEmptyEdu.length - 1

      // Degree header: "Degree" bold + " · Institution · Dates"
      const degreeTitle = e.degree.trim()
      const degreeRest  = join(e.institution, e.dates)
      if (degreeTitle || degreeRest) {
        children.push(entryHeader(degreeTitle || degreeRest, degreeTitle ? degreeRest : '', bodySize))
      }

      // Advisor and details as plain lines; advisor prefixed for readability
      const subLines = [
        e.advisor.trim() ? `Advisor: ${e.advisor.trim()}` : '',
        e.details.trim(),
      ].filter(Boolean)
      subLines.forEach((line, li) => {
        const isLast = isLastEntry && li === subLines.length - 1
        children.push(bodyParagraph(line, isLast ? SECTION_END : BODY_SPACING, bodySize))
      })

      // If no sub-lines, still add section end spacing on last entry
      if (subLines.length === 0 && isLastEntry) {
        // Adjust the header paragraph's after spacing retroactively is not possible in docx-js,
        // so push a zero-height spacer
        children.push(new Paragraph({ children: [], spacing: { after: SECTION_END } }))
      }

      if (!isLastEntry) {
        children.push(new Paragraph({ children: [], spacing: { after: 80 } }))
      }
    })
  }

  // ── Research ─────────────────────────────────────────────────────────────────
  const nonEmptyResearch = research.filter(r => r.trim())
  if (nonEmptyResearch.length > 0) {
    children.push(sectionHeader('Research', bodySize))
    nonEmptyResearch.forEach((r, i) => {
      const isLast = i === nonEmptyResearch.length - 1
      children.push(bulletParagraph(r.trim(), 'bullets-research', bodySize, isLast ? SECTION_END : BULLET_SPACING))
    })
  }

  // ── Skills ───────────────────────────────────────────────────────────────────
  const nonEmptySkills = skills.filter(s => s.trim())
  if (nonEmptySkills.length > 0) {
    children.push(sectionHeader('Skills', bodySize))
    children.push(bodyParagraph(nonEmptySkills.join(' · '), SECTION_END, bodySize))
  }

  // ── Additional sections ───────────────────────────────────────────────────────
  // Group by section name, render each group under its own header
  const addBySectionName: Record<string, string[]> = {}
  for (const a of additional) {
    if (!a.text.trim()) continue
    if (!addBySectionName[a.section]) addBySectionName[a.section] = []
    addBySectionName[a.section].push(a.text.trim())
  }

  Object.entries(addBySectionName).forEach(([sectionName, texts]) => {
    const ref = `bullets-add-${sectionName.toLowerCase().replace(/\s+/g, '-')}`
    children.push(sectionHeader(sectionName, bodySize))
    texts.forEach((text, i) => {
      const isLast = i === texts.length - 1
      children.push(bulletParagraph(text, ref, bodySize, isLast ? SECTION_END : BULLET_SPACING))
    })
  })

  // ── Assemble document ─────────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: BODY_FONT, size: bodySize } },
      },
    },
    numbering: { config: numberingConfig },
    sections: [{
      properties: {
        page: {
          // US Letter: 8.5 × 11 inches; content width = 9360 DXA (12240 − 2 × 1440)
          size:   { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  })

  try {
    const buffer = await Packer.toBuffer(doc)
    const totalFields = [
      ...experience.map(e => e.description), summary,
      ...research, ...skills, ...additional.map(a => a.text),
    ].filter(s => s.trim()).length
    console.log(`[export] Generated .docx | ${totalFields} sections | ${bodySize / 2}pt body | ${buffer.length} bytes`)

    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="resume_tailored.docx"',
      'Content-Length':      String(buffer.length),
    })
    res.send(buffer)

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[export] Packer error:', message)
    res.status(500).json({ error: 'Failed to generate document.' })
  }
}
