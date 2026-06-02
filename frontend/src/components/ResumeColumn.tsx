// ResumeColumn.tsx — structured resume renderer.
//
// Three rules enforced here:
//   1. Fields the LLM left blank (never populated) are not rendered.
//      Fields the user explicitly cleared (field.edited=true) stay visible so they can be re-edited.
//      Approval counting uses ne() (text non-empty); visibility uses hasContent() (text OR edited).
//   2. One approve button per section, at the section header level.
//      Clicking it sets ALL non-empty fields in that section to approved (or toggles all off).
//   3. The counter shows section-level X / Y (not field count).
//
// Section order is hardcoded here — never derived from LLM output.

import type { UIResumeData, UIField, UIExperienceEntry, UIEducationEntry, UIAdditionalEntry } from '../types'
import { FieldCard } from './FieldCard'

type Props = {
  data:              UIResumeData
  estimatedPages:    number
  onApproveSection:  (ids: string[], approved: boolean) => void
  onSave:            (id: string, newText: string) => void
  onFieldHover:      (field: UIField | null) => void
  onDownload:        () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ne(f: UIField): boolean { return f.text.trim() !== '' }   // non-empty
function neFields(fields: UIField[]): UIField[] { return fields.filter(ne) }
// hasContent: true when field has text OR was explicitly edited (keeps cleared fields visible)
function hasContent(f: UIField): boolean { return f.text.trim() !== '' || f.edited }

// Section is approved when every non-empty field in it is approved
function sectionApproved(fields: UIField[]): boolean {
  return fields.length > 0 && fields.every(f => f.approved)
}

// ── Section-level counts (for header counter) ─────────────────────────────────

function computeSectionCounts(data: UIResumeData): { total: number; approved: number } {
  const pdFields  = neFields(Object.values(data.personalDetails) as UIField[])
  const sumFields = ne(data.summary) ? [data.summary] : []
  const expFields = neFields(data.experience.flatMap(e => [e.title, e.organization, e.dates, e.description]))
  const eduFields = neFields(data.education.flatMap(e => [e.degree, e.institution, e.dates, e.advisor, e.details]))
  const resFields = neFields(data.research)
  const sklFields = neFields(data.skills)

  // Additional: one section per distinct section name
  const addGroups: UIField[][] = Object.values(
    data.additional.filter(ne).reduce<Record<string, UIField[]>>((acc, f) => {
      if (!acc[f.section]) acc[f.section] = []
      acc[f.section].push(f)
      return acc
    }, {}),
  )

  const allSections = [pdFields, sumFields, expFields, eduFields, resFields, sklFields, ...addGroups]
    .filter(s => s.length > 0)

  return {
    total:    allSections.length,
    approved: allSections.filter(sectionApproved).length,
  }
}

// ── Page estimate text ────────────────────────────────────────────────────────

function getEstimateText(pages: number, approvedCount: number): string {
  if (approvedCount === 0 || pages <= 0) return ''
  if (pages < 0.95)  return `about ${Math.round(pages * 100)}% of a page`
  if (pages <= 1.05) return 'about 1 page ✓'
  if (pages <= 1.5)  return `about ${pages.toFixed(1)} pages`
  return `about ${Math.round(pages)} pages — consider cutting content`
}

// ── SectionBlock ──────────────────────────────────────────────────────────────

type SectionBlockProps = {
  title:             string
  sectionFields:     UIField[]   // all non-empty fields in this section
  onApproveSection:  (ids: string[], approved: boolean) => void
  children:          React.ReactNode
}

function SectionBlock({ title, sectionFields, onApproveSection, children }: SectionBlockProps) {
  const approved = sectionApproved(sectionFields)
  return (
    <div className="resume-section">
      <div className="resume-section-header">
        <h3 className="resume-section-title">{title}</h3>
        {sectionFields.length > 0 && (
          <button
            className="section-approve-btn"
            data-approved={approved}
            onClick={() => onApproveSection(sectionFields.map(f => f.id), !approved)}
          >
            <span className="approve-lock">{approved ? '🔒' : '🔓'}</span>
            {approved ? ' Approved' : ' Approve'}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Field card helpers ────────────────────────────────────────────────────────

type SharedProps = {
  onSave:  (id: string, newText: string) => void
  onHover: (field: UIField | null) => void
}

function Card({ field, label, multiline, bulletPoints, textPrefix, shared }: {
  field: UIField; label: string; multiline?: boolean
  bulletPoints?: boolean; textPrefix?: string; shared: SharedProps
}) {
  // Hide fields that were never populated. Keep fields the user explicitly
  // cleared (field.edited=true) so they remain visible and re-editable.
  if (!ne(field) && !field.edited) return null
  return (
    <FieldCard
      field={field}
      label={label}
      multiline={multiline}
      bulletPoints={bulletPoints}
      textPrefix={textPrefix}
      onSave={shared.onSave}
      onHoverStart={(f) => shared.onHover(f)}
      onHoverEnd={() => shared.onHover(null)}
    />
  )
}

// ── Entry blocks ──────────────────────────────────────────────────────────────

function ExperienceBlock({ entry, shared }: { entry: UIExperienceEntry; shared: SharedProps }) {
  const hasAny = [entry.title, entry.organization, entry.dates, entry.description].some(hasContent)
  if (!hasAny) return null
  return (
    <div className="resume-entry">
      <Card field={entry.title}        label="Title"        shared={shared} />
      <Card field={entry.organization} label="Organization" shared={shared} />
      <Card field={entry.dates}        label="Dates"        shared={shared} />
      {/* bulletPoints splits on \n and renders each segment as a <li> */}
      <Card field={entry.description}  label="Description"  shared={shared} multiline bulletPoints />
    </div>
  )
}

function EducationBlock({ entry, shared }: { entry: UIEducationEntry; shared: SharedProps }) {
  const hasAny = [entry.degree, entry.institution, entry.dates, entry.advisor, entry.details].some(hasContent)
  if (!hasAny) return null
  return (
    // resume-entry--education tightens the inter-entry gap (education entries are short)
    <div className="resume-entry resume-entry--education">
      <Card field={entry.degree}      label="Degree"      shared={shared} />
      <Card field={entry.institution} label="Institution" shared={shared} />
      <Card field={entry.dates}       label="Dates"       shared={shared} />
      {/* textPrefix is display-only — the stored value remains the bare name */}
      <Card field={entry.advisor}     label="Advisor"     textPrefix="Advisor: " shared={shared} />
      <Card field={entry.details}     label="Details"     shared={shared} multiline />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResumeColumn({ data, estimatedPages, onApproveSection, onSave, onFieldHover, onDownload }: Props) {
  const { total, approved: approvedSections } = computeSectionCounts(data)
  const progressPct  = total > 0 ? Math.round((approvedSections / total) * 100) : 0
  const allDone      = total > 0 && approvedSections === total
  const estimateText = getEstimateText(estimatedPages, approvedSections)

  const shared: SharedProps = { onSave, onHover: onFieldHover }

  // ── Pre-compute which sections have content ─────────────────────────────────
  const pdFields   = neFields(Object.values(data.personalDetails) as UIField[])    // for approval
  const pdVisible  = (Object.values(data.personalDetails) as UIField[]).filter(hasContent)  // for rendering
  const expEntries = data.experience.filter(e =>
    [e.title, e.organization, e.dates, e.description].some(hasContent)
  )
  const expFields  = neFields(data.experience.flatMap(e =>
    [e.title, e.organization, e.dates, e.description]
  ))
  const eduEntries = data.education.filter(e =>
    [e.degree, e.institution, e.dates, e.advisor, e.details].some(hasContent)
  )
  const eduFields  = neFields(data.education.flatMap(e =>
    [e.degree, e.institution, e.dates, e.advisor, e.details]
  ))
  const resFields   = neFields(data.research)              // for approval counting
  const resVisible  = data.research.filter(hasContent)     // for rendering (keeps edited-empty)
  const sklFields   = neFields(data.skills)                // for approval counting
  const sklVisible  = data.skills.filter(hasContent)       // for rendering

  // addBySectionName: for rendering, include edited-empty fields (hasContent)
  // addFieldsBySectionName: for approval counting, only non-empty (ne)
  const addBySectionName: Record<string, UIAdditionalEntry[]> = {}
  const addFieldsBySectionName: Record<string, UIAdditionalEntry[]> = {}
  for (const f of data.additional) {
    if (hasContent(f)) {
      if (!addBySectionName[f.section]) addBySectionName[f.section] = []
      addBySectionName[f.section].push(f)
    }
    if (ne(f)) {
      if (!addFieldsBySectionName[f.section]) addFieldsBySectionName[f.section] = []
      addFieldsBySectionName[f.section].push(f)
    }
  }

  return (
    <div className="resume-column">

      <div className="resume-header">
        <div className="resume-header-top">
          <h2 className="column-label">Tailored Resume</h2>
          <div className="resume-header-right">
            <span className="progress-label" data-done={allDone}>
              {approvedSections} / {total} approved
            </span>
            {/* Always rendered so its line height is permanently reserved — no layout shift on first approval */}
            <span className="page-estimate-inline">{estimateText || ' '}</span>
          </div>
        </div>

        {/* Inline download button — disabled until all sections approved */}
        {total > 0 && (
          <button
            className="column-download-btn"
            disabled={!allDone}
            onClick={allDone ? onDownload : undefined}
          >
            {allDone
              ? '↓ Download Resume'
              : `Review and approve each section to download (${approvedSections}/${total})`}
          </button>
        )}

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="resume-lines">

        {/* ── Personal Details ─────────────────────────────────────────────── */}
        {pdVisible.length > 0 && (
          <SectionBlock title="Personal Details" sectionFields={pdFields} onApproveSection={onApproveSection}>
            <Card field={data.personalDetails.name}          label="Name"          shared={shared} />
            <Card field={data.personalDetails.email}         label="Email"         shared={shared} />
            <Card field={data.personalDetails.phone}         label="Phone"         shared={shared} />
            <Card field={data.personalDetails.location}      label="Location"      shared={shared} />
            <Card field={data.personalDetails.website}       label="Website"       shared={shared} />
            <Card field={data.personalDetails.linkedin}      label="LinkedIn"      shared={shared} />
            <Card field={data.personalDetails.github}        label="GitHub"        shared={shared} />
            <Card field={data.personalDetails.googleScholar} label="Google Scholar" textPrefix="Google Scholar: " shared={shared} />
          </SectionBlock>
        )}

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        {hasContent(data.summary) && (
          <SectionBlock title="Summary" sectionFields={ne(data.summary) ? [data.summary] : []} onApproveSection={onApproveSection}>
            <Card field={data.summary} label="Summary" shared={shared} multiline />
          </SectionBlock>
        )}

        {/* ── Experience ────────────────────────────────────────────────────── */}
        {expEntries.length > 0 && (
          <SectionBlock title="Experience" sectionFields={expFields} onApproveSection={onApproveSection}>
            {expEntries.map(entry => (
              <ExperienceBlock key={entry.id} entry={entry} shared={shared} />
            ))}
          </SectionBlock>
        )}

        {/* ── Education ─────────────────────────────────────────────────────── */}
        {eduEntries.length > 0 && (
          <SectionBlock title="Education" sectionFields={eduFields} onApproveSection={onApproveSection}>
            {eduEntries.map(entry => (
              <EducationBlock key={entry.id} entry={entry} shared={shared} />
            ))}
          </SectionBlock>
        )}

        {/* ── Research ──────────────────────────────────────────────────────── */}
        {resVisible.length > 0 && (
          <SectionBlock title="Research" sectionFields={resFields} onApproveSection={onApproveSection}>
            {resVisible.map((f, i) => (
              <Card key={f.id} field={f} label={`Research ${i + 1}`} shared={shared} />
            ))}
          </SectionBlock>
        )}

        {/* ── Skills ────────────────────────────────────────────────────────── */}
        {sklVisible.length > 0 && (
          <SectionBlock title="Skills" sectionFields={sklFields} onApproveSection={onApproveSection}>
            {sklVisible.map((f, i) => (
              <Card key={f.id} field={f} label={`Skills ${i + 1}`} shared={shared} />
            ))}
          </SectionBlock>
        )}

        {/* ── Additional sections ────────────────────────────────────────────── */}
        {Object.entries(addBySectionName).map(([sectionName, entries]) => (
          <SectionBlock
            key={sectionName}
            title={sectionName}
            sectionFields={addFieldsBySectionName[sectionName] ?? []}
            onApproveSection={onApproveSection}
          >
            {entries.map(f => (
              <Card key={f.id} field={f} label={sectionName} shared={shared} />
            ))}
          </SectionBlock>
        ))}

      </div>
    </div>
  )
}
