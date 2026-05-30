// tailor.test.ts — critical path tests for the two-stage LLM pipeline.
//
// All LLM calls are mocked. No network requests are made.
// Covers four areas:
//   1. Pipeline output shape
//   2. Grounding contract (references are real substrings of the inputs)
//   3. Input validation at the HTTP boundary
//   4. Graceful handling when the LLM errors or returns garbage

// ── Mocks (hoisted before imports by Jest) ────────────────────────────────────

jest.mock('../llmClient')

jest.mock('../prompts', () => ({
  STAGE_1_SYSTEM: 'mock-stage1-system',
  STAGE_1_USER:   (job: string) => `mock-stage1-user: ${job}`,
  STAGE_2_SYSTEM: 'mock-stage2-system',
  STAGE_2_USER:   (_job: string, _bg: string, _s: object) => 'mock-stage2-user',
}))

jest.mock('../supabaseClient', () => ({
  getSupabase: jest.fn(),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import request     from 'supertest'
import express     from 'express'
import { callLLM } from '../llmClient'
import { tailorHandler } from '../routes/tailor'

// ── Test app ─────────────────────────────────────────────────────────────────
// Minimal Express instance — no auth middleware, so req.userId is undefined
// and the Supabase DB-persistence block is skipped cleanly.

const app = express()
app.use(express.json())
app.post('/api/tailor', tailorHandler)

// ── Typed mock handle ─────────────────────────────────────────────────────────

const mockedCallLLM = callLLM as jest.MockedFunction<typeof callLLM>

// ── Fixtures ──────────────────────────────────────────────────────────────────
// The reference strings embedded in VALID_STAGE2 are intentional verbatim
// substrings of JOB_POSTING and BACKGROUND — tests 2.1 and 2.2 verify this.

const JOB_POSTING =
  'We are hiring a TypeScript engineer with React experience and strong problem-solving skills.'

const BACKGROUND =
  'Jane Smith, jane@example.com. Software Engineer at Acme Corp from 2021 to 2023. ' +
  'Built TypeScript and React applications.'

const VALID_STAGE1 = JSON.stringify({
  roleArchetype:  'SWE at a product company',
  whatRoleValues: ['TypeScript expertise', 'React experience'],
  fitAssessment:  'Strong fit for TypeScript and React candidates.',
  gaps:           ['May lack senior leadership experience'],
})

const VALID_STAGE2 = JSON.stringify({
  personalDetails: {
    name:          'Jane Smith',
    email:         'jane@example.com',
    phone:         '',
    location:      '',
    website:       '',
    linkedin:      '',
    github:        '',
    googleScholar: '',
  },
  summary: {
    text:                'Experienced TypeScript engineer with React expertise.',
    postingReference:    ['TypeScript engineer with React experience'],
    //backgroundReference: ['This reference is not in the source text'],
    backgroundReference: ['Software Engineer at Acme Corp'],
  },
  experience: [
    {
      title:               'Software Engineer',
      organization:        'Acme Corp',
      dates:               '2021 to 2023',
      description:         'Built TypeScript and React applications.',
      postingReference:    ['TypeScript engineer with React experience'],
      backgroundReference: ['Built TypeScript and React applications'],
    },
  ],
  education: [
    {
      degree:      'B.S. Computer Science',
      institution: 'MIT',
      dates:       '2019',
      advisor:     '',
      details:     '',
    },
  ],
  research:   [],
  skills: [
    {
      text:                'TypeScript · React',
      postingReference:    ['TypeScript engineer'],
      backgroundReference: ['TypeScript and React applications'],
    },
  ],
  additional: [],
})

// Helper: set up both stages to succeed with the standard fixtures
function twoStageSuccess(): void {
  mockedCallLLM
    .mockResolvedValueOnce(VALID_STAGE1)
    .mockResolvedValueOnce(VALID_STAGE2)
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Area 1: Pipeline output shape ─────────────────────────────────────────────

describe('Area 1 — Pipeline output shape', () => {

  test('1.1 response has strategy, resume, and generatedAt at the top level', async () => {
    twoStageSuccess()
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('strategy')
    expect(res.body).toHaveProperty('resume')
    expect(res.body).toHaveProperty('generatedAt')
  })

  test('1.2 personalDetails has all 8 required string fields', async () => {
    twoStageSuccess()
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    const pd = res.body.resume.personalDetails
    const fields = ['name', 'email', 'phone', 'location', 'website', 'linkedin', 'github', 'googleScholar']
    for (const field of fields) {
      expect(pd).toHaveProperty(field)
      expect(typeof pd[field]).toBe('string')
    }
  })

  test('1.3 each experience entry has title, organization, dates, description, and reference arrays', async () => {
    twoStageSuccess()
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    const experience: unknown[] = res.body.resume.experience
    expect(Array.isArray(experience)).toBe(true)
    for (const entry of experience as Record<string, unknown>[]) {
      for (const field of ['title', 'organization', 'dates', 'description']) {
        expect(typeof entry[field]).toBe('string')
      }
      expect(Array.isArray(entry.postingReference)).toBe(true)
      expect(Array.isArray(entry.backgroundReference)).toBe(true)
    }
  })

  test('1.4 each education entry has degree, institution, dates, advisor, and details', async () => {
    twoStageSuccess()
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    const education: unknown[] = res.body.resume.education
    expect(Array.isArray(education)).toBe(true)
    for (const entry of education as Record<string, unknown>[]) {
      for (const field of ['degree', 'institution', 'dates', 'advisor', 'details']) {
        expect(typeof entry[field]).toBe('string')
      }
    }
  })

  test('1.5 research, skills, and additional are always arrays (never undefined)', async () => {
    twoStageSuccess()
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    expect(Array.isArray(res.body.resume.research)).toBe(true)
    expect(Array.isArray(res.body.resume.skills)).toBe(true)
    expect(Array.isArray(res.body.resume.additional)).toBe(true)
  })

  test('1.6 missing fields in LLM response default to empty strings and arrays — no crash', async () => {
    // Deliberately sparse Stage 2: empty objects instead of shaped entries
    const sparseStage2 = JSON.stringify({
      personalDetails: {},
      summary:         {},
      experience:      [{}],
      education:       [{}],
      research:        [],
      skills:          [],
      additional:      [],
    })
    mockedCallLLM
      .mockResolvedValueOnce(VALID_STAGE1)
      .mockResolvedValueOnce(sparseStage2)

    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    expect(res.status).toBe(200)
    const exp = res.body.resume.experience[0] as Record<string, unknown>
    expect(exp.title).toBe('')
    expect(exp.organization).toBe('')
    expect(exp.dates).toBe('')
    expect(exp.description).toBe('')
    expect(exp.postingReference).toEqual([])
    expect(exp.backgroundReference).toEqual([])
  })

})

// ── Area 2: Grounding contract ────────────────────────────────────────────────

describe('Area 2 — Grounding contract', () => {

  test('2.1 every postingReference in the output is a verbatim substring of the job posting', async () => {
    twoStageSuccess()
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    const { resume } = res.body
    const allRefs: string[] = [
      ...resume.summary.postingReference,
      ...(resume.experience as Record<string, string[]>[]).flatMap(e => e.postingReference),
      ...(resume.skills     as Record<string, string[]>[]).flatMap(s => s.postingReference),
    ]
    expect(allRefs.length).toBeGreaterThan(0) // fixture must have at least one reference
    for (const ref of allRefs) {
      expect(JOB_POSTING).toContain(ref)
    }
  })

  test('2.2 every backgroundReference in the output is a verbatim substring of the background', async () => {
    twoStageSuccess()
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    const { resume } = res.body
    const allRefs: string[] = [
      ...resume.summary.backgroundReference,
      ...(resume.experience as Record<string, string[]>[]).flatMap(e => e.backgroundReference),
      ...(resume.skills     as Record<string, string[]>[]).flatMap(s => s.backgroundReference),
    ]
    expect(allRefs.length).toBeGreaterThan(0)
    for (const ref of allRefs) {
      expect(BACKGROUND).toContain(ref)
    }
  })

  test('2.3 non-string values in reference arrays are filtered out without crashing', async () => {
    const stage2WithBadRefs = JSON.stringify({
      ...JSON.parse(VALID_STAGE2),
      summary: {
        text:                'A summary.',
        // number, null, object, and one valid string — only the string should survive
        postingReference:    [42, null, { nested: true }, 'TypeScript engineer with React experience'],
        backgroundReference: [undefined, 'Software Engineer at Acme Corp'],
      },
    })
    mockedCallLLM
      .mockResolvedValueOnce(VALID_STAGE1)
      .mockResolvedValueOnce(stage2WithBadRefs)

    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    expect(res.status).toBe(200)
    const postingRefs: unknown[] = res.body.resume.summary.postingReference
    const bgRefs: unknown[]      = res.body.resume.summary.backgroundReference
    expect(postingRefs.every(r => typeof r === 'string')).toBe(true)
    expect(bgRefs.every(r => typeof r === 'string')).toBe(true)
    expect(postingRefs).toContain('TypeScript engineer with React experience')
    expect(bgRefs).toContain('Software Engineer at Acme Corp')
  })

  test('2.4 empty reference arrays are preserved as [] not undefined', async () => {
    const stage2WithEmptyRefs = JSON.stringify({
      ...JSON.parse(VALID_STAGE2),
      summary: {
        text:                'A summary.',
        postingReference:    [],
        backgroundReference: [],
      },
    })
    mockedCallLLM
      .mockResolvedValueOnce(VALID_STAGE1)
      .mockResolvedValueOnce(stage2WithEmptyRefs)

    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    expect(res.status).toBe(200)
    expect(res.body.resume.summary.postingReference).toEqual([])
    expect(res.body.resume.summary.backgroundReference).toEqual([])
  })

})

// ── Area 3: Input validation ──────────────────────────────────────────────────

describe('Area 3 — Input validation', () => {

  test('3.1 empty jobPosting → 400, LLM never called', async () => {
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: '', candidateBackground: BACKGROUND })

    expect(res.status).toBe(400)
    expect(mockedCallLLM).not.toHaveBeenCalled()
  })

  test('3.2 whitespace-only jobPosting → 400', async () => {
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: '   \n\t  ', candidateBackground: BACKGROUND })

    expect(res.status).toBe(400)
    expect(mockedCallLLM).not.toHaveBeenCalled()
  })

  test('3.3 empty candidateBackground → 400, LLM never called', async () => {
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: '' })

    expect(res.status).toBe(400)
    expect(mockedCallLLM).not.toHaveBeenCalled()
  })

  test('3.4 jobPosting over 5 000 words → 400, error mentions limit', async () => {
    const overLimit = Array(5001).fill('word').join(' ')
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: overLimit, candidateBackground: BACKGROUND })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/5,000/)
    expect(mockedCallLLM).not.toHaveBeenCalled()
  })

  test('3.5 candidateBackground over 15 000 words → 400, error mentions limit', async () => {
    const overLimit = Array(15001).fill('word').join(' ')
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: overLimit })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/15,000/)
    expect(mockedCallLLM).not.toHaveBeenCalled()
  })

  test('3.6 non-string jobPosting (number) → 400', async () => {
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: 42, candidateBackground: BACKGROUND })

    expect(res.status).toBe(400)
    expect(mockedCallLLM).not.toHaveBeenCalled()
  })

  test('3.7 missing both fields (empty body) → 400', async () => {
    const res = await request(app)
      .post('/api/tailor')
      .send({})

    expect(res.status).toBe(400)
    expect(mockedCallLLM).not.toHaveBeenCalled()
  })

})

// ── Area 4: LLM failure handling ──────────────────────────────────────────────

describe('Area 4 — LLM failure handling', () => {

  test('4.1 callLLM throws a network error → 500 JSON body, server does not crash', async () => {
    mockedCallLLM.mockRejectedValue(new Error('ECONNREFUSED'))
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
    expect(typeof res.body.error).toBe('string')
    // Critically: response is JSON, not an HTML crash page
    expect(res.headers['content-type']).toMatch(/json/)
  })

  test('4.2 LLM returns unparseable prose → 500 with JSON parse error message', async () => {
    mockedCallLLM.mockResolvedValue("Sorry, I can't help with that.")
    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/parsed as JSON/i)
  })

  test('4.3 LLM wraps JSON in markdown code fences → fences are stripped, returns 200', async () => {
    mockedCallLLM
      .mockResolvedValueOnce('```json\n' + VALID_STAGE1 + '\n```')
      .mockResolvedValueOnce('```json\n' + VALID_STAGE2 + '\n```')

    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    expect(res.status).toBe(200)
    expect(res.body.resume).toBeDefined()
  })

  test('4.4 Stage 1 returns wrong JSON shape → 500, Stage 2 never called', async () => {
    mockedCallLLM.mockResolvedValueOnce(JSON.stringify({ thisIsNot: 'a positioning strategy' }))

    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    expect(res.status).toBe(500)
    // Only Stage 1 should have been called
    expect(mockedCallLLM).toHaveBeenCalledTimes(1)
  })

  test('4.5 Stage 1 throws → Stage 2 never called', async () => {
    mockedCallLLM.mockRejectedValueOnce(new Error('upstream timeout'))

    const res = await request(app)
      .post('/api/tailor')
      .send({ jobPosting: JOB_POSTING, candidateBackground: BACKGROUND })

    expect(res.status).toBe(500)
    expect(mockedCallLLM).toHaveBeenCalledTimes(1)
  })

})
