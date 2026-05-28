// routes/export.ts — generates a .docx file from approved resume lines.
//
// Accepts a POST with { name, contact, links, lines[] } and returns a binary
// .docx file ready for download.
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

// ── Input shape ───────────────────────────────────────────────────────────────

type ExportLine = { text: string; section?: string }

type ExportBody = {
  name:    string
  contact: string
  links:   string
  lines:   ExportLine[]
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

// Standard font/size for body text (half-points: 22 = 11pt)
const BODY_FONT  = 'Calibri'
const BODY_SIZE  = 22   // 11pt

// A section header paragraph with a subtle bottom rule
function sectionHeader(title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: title.toUpperCase(), bold: true, size: BODY_SIZE, color: '2E2E2E', font: BODY_FONT }),
    ],
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC', space: 4 },
    },
  })
}

// A plain body paragraph
function bodyParagraph(text: string, spacingAfter = 80): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: BODY_SIZE, font: BODY_FONT })],
    spacing: { after: spacingAfter },
  })
}

// A bullet paragraph — requires a numbering reference registered on the Document
function bulletParagraph(text: string, ref: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: BODY_SIZE, font: BODY_FONT })],
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

  const { name, contact, links, lines } = req.body

  if (!lines.length) {
    res.status(400).json({ error: 'No lines to export.' })
    return
  }

  // Group lines by section, preserving insertion order
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
  // Also handle any out-of-order sections that happen to be bullet sections
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

  // — Name header
  if (name.trim()) {
    children.push(new Paragraph({
      children: [new TextRun({ text: name.trim(), bold: true, size: 36, font: BODY_FONT })],
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 40 },
    }))
  }

  // — Contact line (10pt, muted)
  if (contact.trim()) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contact.trim(), size: 20, color: '666666', font: BODY_FONT })],
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 80 },
    }))
  }

  // — Links line (same style, more spacing after)
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

    children.push(sectionHeader(section))

    if (section === 'Summary') {
      // Single paragraph — join multiple summary lines with a space
      children.push(bodyParagraph(sectionLines.join(' '), 160))

    } else if (section === 'Education') {
      // Plain paragraphs — no bullets, preserve as-is
      for (const line of sectionLines) {
        children.push(bodyParagraph(line, 80))
      }

    } else if (section === 'Skills') {
      // All skill lines joined with · separator into one paragraph
      children.push(bodyParagraph(sectionLines.join(' · '), 160))

    } else if (BULLET_SECTIONS.has(section)) {
      // Bullet points with a per-section numbering reference
      const ref = bulletRefs[section]
      for (const line of sectionLines) {
        children.push(bulletParagraph(line, ref))
      }

    } else {
      // Fallback: plain paragraphs
      for (const line of sectionLines) {
        children.push(bodyParagraph(line, 80))
      }
    }
  }

  // — Any sections not in SECTION_ORDER (edge case)
  for (const [section, sectionLines] of grouped) {
    if (SECTION_ORDER.includes(section)) continue
    children.push(sectionHeader(section))
    for (const line of sectionLines) {
      children.push(bodyParagraph(line, 80))
    }
  }

  // ── Assemble document ───────────────────────────────────────────────────────

  const doc = new Document({
    // Default character properties for the whole document
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: BODY_SIZE },
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
    console.log(`[export] Generated .docx | ${lines.length} lines | ${buffer.length} bytes`)

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
