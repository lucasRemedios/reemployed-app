// routes/export.ts — generates a .docx file from approved resume lines.
//
// Accepts a POST with { name, contact, links, lines[], estimatedPages? }
// and returns a binary .docx file ready for download.
//
// Font scaling safety net:
//   If estimatedPages > 1.05, body text is reduced from 11pt in 0.5pt steps
//   down to a minimum of 10pt until the scaled estimate fits within one page.
//   The name/contact/links header and section header sizes are never changed.
//
// Critical docx rules enforced here:
//   • NEVER \n in text — each logical line is a separate Paragraph
//   • NEVER manual unicode bullets — use LevelFormat.BULLET + numbering config
//   • Page size explicitly set to US Letter (docx-js defaults to A4)
//   • Separate numbering reference per bullet section so they're independent
//   • All widths in DXA (twentieths of a point)

import { Request, Response } from 'express'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  LevelFormat,
} from 'docx'

// ── Section configuration ─────────────────────────────────────────────────────

// Canonical section order — empty sections are skipped entirely
const SECTION_ORDER = [
  'Summary', 'Experience', 'Research', 'Education',
  'Skills', 'Publications', 'Teaching', 'Leadership', 'Projects',
]

// Sections whose lines become bullet points
const BULLET_SECTIONS = new Set([
  'Experience', 'Research', 'Publications', 'Teaching', 'Leadership', 'Projects',
])

// ── Font size constants ───────────────────────────────────────────────────────
// All sizes are in half-points (Word's internal unit: 22 = 11pt, 20 = 10pt).
// Only BODY_SIZE_DEFAULT is ever scaled; the header sizes stay fixed.

const BODY_FONT         = 'Calibri'
const BODY_SIZE_DEFAULT = 22   // 11pt — normal body text
const BODY_SIZE_MIN     = 20   // 10pt — minimum allowed when scaling for overflow

// ── Input shape ───────────────────────────────────────────────────────────────

type ExportLine = { text: string; section?: string }

type ExportBody = {
  name:           string
  contact:        string
  links:          string
  lines:          ExportLine[]
  estimatedPages?: number   // optional; passed by the frontend for scaling hints
}

function isExportBody(body: unknown): body is ExportBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.name    === 'string' &&
    typeof b.contact === 'string' &&
    typeof b.links   === 'string' &&
    Array.isArray(b.lines) &&
    (b.lines as unknown[]).every(
      l => typeof l === 'object' && l !== null && typeof (l as Record<string, unknown>).text === 'string'
    )
  )
}

// ── Document helpers ──────────────────────────────────────────────────────────
// Each helper accepts `size` so the body font can be scaled at export time.

function sectionHeader(title: string, size: number): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: title.toUpperCase(), bold: true, size, color: '2E2E2E', font: BODY_FONT }),
    ],
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC', space: 4 },
    },
  })
}

function bodyParagraph(text: string, spacingAfter: number, size: number): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size, font: BODY_FONT })],
    spacing: { after: spacingAfter },
  })
}

function bulletParagraph(text: string, ref: string, size: number): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size, font: BODY_FONT })],
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80 },
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function exportHandler(req: Request, res: Response): Promise<void> {
  if (!isExportBody(req.body)) {
    res.status(400).json({ error: 'Invalid export request body.' })
    return
  }

  const { name, contact, links, lines, estimatedPages } = req.body

  if (!lines.length) {
    res.status(400).json({ error: 'No lines to export.' })
    return
  }

  // ── Font scaling ────────────────────────────────────────────────────────────
  // If the frontend estimates overflow, step the font down from 11pt in 0.5pt
  // increments until the scaled estimate no longer exceeds 1.05 pages, or we
  // hit the 10pt floor.  Scaling is quadratic: smaller font → more chars/line
  // AND more lines/page, so effect compounds.
  let bodySize = BODY_SIZE_DEFAULT
  if (typeof estimatedPages === 'number' && estimatedPages > 1.05) {
    let scaledEstimate = estimatedPages
    while (bodySize > BODY_SIZE_MIN && scaledEstimate > 1.05) {
      bodySize--   // 1 half-point = 0.5pt reduction
      const fontRatio = bodySize / BODY_SIZE_DEFAULT
      scaledEstimate  = estimatedPages * fontRatio * fontRatio
    }
    console.log(
      `[export] Font scaled ${BODY_SIZE_DEFAULT / 2}pt → ${bodySize / 2}pt` +
      ` (frontend estimate: ${estimatedPages.toFixed(2)} pages)`
    )
  }

  // ── Group lines by section ──────────────────────────────────────────────────
  const grouped = new Map<string, string[]>()
  for (const line of lines) {
    const section = line.section ?? 'Other'
    if (!grouped.has(section)) grouped.set(section, [])
    grouped.get(section)!.push(line.text)
  }

  // Build one numbering reference per bullet section that actually has lines
  const bulletRefs: Record<string, string> = {}
  for (const section of SECTION_ORDER) {
    if (BULLET_SECTIONS.has(section) && grouped.has(section)) {
      bulletRefs[section] = `bullets-${section.toLowerCase()}`
    }
  }
  // Handle any out-of-order sections that are also bullet sections
  for (const [section] of grouped) {
    if (BULLET_SECTIONS.has(section) && !bulletRefs[section]) {
      bulletRefs[section] = `bullets-${section.toLowerCase()}-extra`
    }
  }

  const numberingConfig = Object.values(bulletRefs).map(reference => ({
    reference,
    levels: [{
      level:     0,
      format:    LevelFormat.BULLET,
      text:      '•',
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: { indent: { left: 360, hanging: 180 } },
      },
    }],
  }))

  // ── Build paragraph list ────────────────────────────────────────────────────
  const children: Paragraph[] = []

  // — Name header (18pt, always fixed — not affected by body scaling)
  if (name.trim()) {
    children.push(new Paragraph({
      children: [new TextRun({ text: name.trim(), bold: true, size: 36, font: BODY_FONT })],
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 40 },
    }))
  }

  // — Contact line (10pt, muted — fixed size)
  if (contact.trim()) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contact.trim(), size: 20, color: '666666', font: BODY_FONT })],
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 80 },
    }))
  }

  // — Links line (fixed size)
  if (links.trim()) {
    children.push(new Paragraph({
      children: [new TextRun({ text: links.trim(), size: 20, color: '666666', font: BODY_FONT })],
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 160 },
    }))
  }

  // — Thin horizontal rule (border-only paragraph, no text)
  children.push(new Paragraph({
    children: [],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '2E2E2E', space: 1 },
    },
    spacing: { after: 160 },
  }))

  // — Sections in canonical order first
  for (const section of SECTION_ORDER) {
    const sectionLines = grouped.get(section)
    if (!sectionLines?.length) continue

    children.push(sectionHeader(section, bodySize))

    if (section === 'Summary') {
      children.push(bodyParagraph(sectionLines.join(' '), 160, bodySize))

    } else if (section === 'Education') {
      for (const line of sectionLines) {
        children.push(bodyParagraph(line, 80, bodySize))
      }

    } else if (section === 'Skills') {
      children.push(bodyParagraph(sectionLines.join(' · '), 160, bodySize))

    } else if (BULLET_SECTIONS.has(section)) {
      const ref = bulletRefs[section]
      for (const line of sectionLines) {
        children.push(bulletParagraph(line, ref, bodySize))
      }

    } else {
      for (const line of sectionLines) {
        children.push(bodyParagraph(line, 80, bodySize))
      }
    }
  }

  // — Any sections not in SECTION_ORDER (edge case)
  for (const [section, sectionLines] of grouped) {
    if (SECTION_ORDER.includes(section)) continue
    children.push(sectionHeader(section, bodySize))
    for (const line of sectionLines) {
      children.push(bodyParagraph(line, 80, bodySize))
    }
  }

  // ── Assemble document ───────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: bodySize },
        },
      },
    },
    numbering: {
      config: numberingConfig,
    },
    sections: [{
      properties: {
        page: {
          // US Letter: 8.5 × 11 inches in DXA (1 inch = 1440 DXA)
          size:   { width: 12240, height: 15840 },
          // 1-inch margins on all sides
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  })

  try {
    const buffer = await Packer.toBuffer(doc)
    console.log(
      `[export] Generated .docx | ${lines.length} lines | ${bodySize / 2}pt body | ${buffer.length} bytes`
    )

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
