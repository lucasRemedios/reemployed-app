// sampleData.ts — fake resume output that matches the real ResumeLineItem type.
//
// Purpose: lets us build and test the right-column UI (Phase 3) before
// the LLM is wired up. Every field matches the types in types.ts exactly,
// so swapping in real data in Phase 4 requires zero structural changes.

import type { ResumeLineItem, PositioningStrategy } from './types'

export const SAMPLE_STRATEGY: PositioningStrategy = {
  roleArchetype: 'Applied Scientist at a mid-stage AI startup',
  whatRoleValues: [
    'Production ML systems experience',
    'Independent research with measurable impact',
    'Ability to move fast across the full stack',
    'Cross-functional collaboration with eng and product',
  ],
  fitAssessment:
    'Strong fit on the research and modeling side — the PhD and publication record directly address what this team is building. The main question mark is production systems: the role expects someone who has shipped models to real users, not just to papers. The background has hints of this but they need to be surfaced explicitly.',
  gaps: [
    'No explicit mention of owning a production ML system end-to-end',
    'Limited signal on cross-functional work (eng/product collaboration)',
  ],
}

export const SAMPLE_LINES: ResumeLineItem[] = [
  // ── Summary ────────────────────────────────────────────────────────────────
  {
    id: 'sum-1',
    section: 'Summary',
    text: 'AI researcher with 6 years of experience building and deploying NLP systems — from PhD-level modeling to production infrastructure serving millions of users.',
    postingReference: 'Job posting: "We want someone who can go from research idea to shipped feature."',
    backgroundReference: 'Background: PhD in NLP, dissertation on low-resource sequence modeling; led deployment of content-moderation classifier at Acme Corp (2M daily requests).',
    approved: false,
    edited: false,
  },

  // ── Experience ─────────────────────────────────────────────────────────────
  {
    id: 'exp-1',
    section: 'Experience',
    text: 'Designed and shipped a BERT-based content moderation system handling 2M daily requests with <40ms p99 latency.',
    postingReference: 'Job posting: "Experience deploying ML models to production at scale."',
    backgroundReference: 'Background: "Built BERT classifier for Acme content team; worked with infra eng to deploy on AWS Lambda with quantization."',
    approved: false,
    edited: false,
  },
  {
    id: 'exp-2',
    section: 'Experience',
    text: 'Reduced annotation cost by 60% by developing an active-learning pipeline that prioritised uncertain examples for human review.',
    postingReference: 'Job posting: "We care about efficient use of labeling budget."',
    backgroundReference: 'Background: "Built AL loop for low-resource NER project; cut labeling hours from 400 to 160 for equivalent model performance."',
    approved: false,
    edited: false,
  },
  {
    id: 'exp-3',
    section: 'Experience',
    text: 'Collaborated with product and engineering to define model evaluation criteria and ship iterative improvements on a two-week release cycle.',
    postingReference: 'Job posting: "Work closely with product and engineering."',
    backgroundReference: 'Background: "Ran bi-weekly model reviews with PM and two eng leads at Acme; drove three consecutive quality improvements over Q3."',
    approved: false,
    edited: false,
  },

  // ── Research ───────────────────────────────────────────────────────────────
  {
    id: 'res-1',
    section: 'Research',
    text: 'Published 4 peer-reviewed papers on low-resource NLP at ACL and EMNLP; one cited 200+ times within two years.',
    postingReference: 'Job posting: "Research background and ability to engage with the academic literature."',
    backgroundReference: 'Background: "PhD dissertation and 4 papers — ACL 2021, EMNLP 2021, ACL 2022, ACL 2023. ACL 2021 paper at 230 citations."',
    approved: false,
    edited: false,
  },

  // ── Skills ─────────────────────────────────────────────────────────────────
  {
    id: 'skl-1',
    section: 'Skills',
    text: 'Python · PyTorch · HuggingFace Transformers · AWS (Lambda, S3, SageMaker) · SQL · Git',
    postingReference: 'Job posting: "Proficiency in Python and modern ML frameworks; cloud deployment experience a plus."',
    backgroundReference: 'Background: "Used throughout dissertation and industry roles."',
    approved: false,
    edited: false,
  },
]
