// sampleData.ts
//
// Three exports:
//   SAMPLE_JOB_POSTING   — pre-fills the left textarea
//   SAMPLE_BACKGROUND    — pre-fills the middle textarea
//   SAMPLE_LINES         — seeds the right column
//
// IMPORTANT: postingReference and backgroundReference must be
// verbatim substrings of the corresponding sample text above —
// the highlight overlay does a literal string search to find
// where to draw the highlight.

import type { ResumeLineItem, PositioningStrategy } from './types'

// ── Sample job posting ────────────────────────────────────────────────────────

export const SAMPLE_JOB_POSTING = `Senior Applied Scientist — Conversational AI
Acme AI · San Francisco, CA (Hybrid) · Full-time

About the role
We are building conversational AI products used by millions of people, and we want someone who can move from research idea to shipped feature. You will own problems end-to-end: formulate the question, run the experiment, deploy the model, and iterate on real user data.

What you'll do
• Design and run experiments on large-scale NLP and LLM systems
• Deploy and monitor ML models serving millions of daily requests
• Work closely with product and engineering on evaluation criteria and release cycles
• Engage with the academic literature and bring relevant ideas into production

What we're looking for
• Experience deploying ML models to production at scale
• Research background; publications at venues like ACL, EMNLP, or NeurIPS are a strong plus
• Strong Python skills and experience with PyTorch and the HuggingFace ecosystem
• We value efficient use of our annotation and labeling budget
• Cloud deployment experience (AWS or GCP) is a plus
• Able to collaborate across research, engineering, and product`

// ── Sample candidate background ───────────────────────────────────────────────

export const SAMPLE_BACKGROUND = `PhD, Natural Language Processing — Stanford University, 2023
Dissertation: Low-Resource Sequence Modeling under Constrained Supervision

Research
Four peer-reviewed papers at top NLP venues:
— "Efficient Active Learning for Low-Resource NER", ACL 2021 (cited 230+ times)
— "Constrained Decoding for Faithful Text Generation", EMNLP 2021
— "Cross-lingual Transfer with Sparse Adapters", ACL 2022
— "Few-Shot Adaptation via Meta-Prompted Fine-Tuning", ACL 2023

Industry: Applied Scientist, Acme Corp (2021–2023)
Led the design and deployment of a BERT-based content moderation classifier. Worked with the infrastructure team to ship it on AWS Lambda with int8 quantization — 2M daily requests, under 40ms p99 latency.

Built an active learning pipeline that cut annotation cost by 60% by prioritising the most uncertain examples for human review. We went from 400 labelling hours to 160 for equivalent model quality.

Collaborated with the PM and two engineering leads on a bi-weekly release cadence. Defined evaluation metrics jointly with the product team and shipped three consecutive improvements over Q3 2022.

Technical skills
Python, PyTorch, HuggingFace Transformers, AWS (Lambda, S3, SageMaker), Docker, SQL, Git`

// ── Positioning strategy ─────────────────────────────────────────────────────

export const SAMPLE_STRATEGY: PositioningStrategy = {
  roleArchetype: 'Applied Scientist at a mid-stage AI product company',
  whatRoleValues: [
    'End-to-end ownership: research to production',
    'Experience deploying ML models at scale',
    'Efficient use of annotation budget',
    'Cross-functional collaboration',
    'Strong publication record',
  ],
  fitAssessment:
    'Strong fit on research depth and production deployment — the PhD, publication record, and Acme Corp deployment experience directly match what this role needs. The main question is whether the cross-functional collaboration signal is explicit enough; the background has it but it needs surfacing.',
  gaps: [
    'No explicit mention of LLM-specific work (role emphasises conversational AI)',
    'Cloud deployment mentioned but not highlighted as a strength',
  ],
}

// ── Resume line items ─────────────────────────────────────────────────────────
// postingReference and backgroundReference are exact verbatim substrings
// of SAMPLE_JOB_POSTING and SAMPLE_BACKGROUND respectively.

export const SAMPLE_LINES: ResumeLineItem[] = [
  {
    id: 'sum-1',
    section: 'Summary',
    text: 'NLP researcher and engineer with 6 years of experience — from PhD-level modeling to production systems serving millions of users daily.',
    postingReference: 'move from research idea to shipped feature',
    backgroundReference: 'PhD, Natural Language Processing — Stanford University, 2023',
    approved: false,
    edited: false,
  },
  {
    id: 'exp-1',
    section: 'Experience',
    text: 'Designed and shipped a BERT-based content moderation classifier handling 2M daily requests at under 40ms p99 latency on AWS Lambda.',
    postingReference: 'Experience deploying ML models to production at scale',
    backgroundReference: 'ship it on AWS Lambda with int8 quantization — 2M daily requests, under 40ms p99 latency',
    approved: false,
    edited: false,
  },
  {
    id: 'exp-2',
    section: 'Experience',
    text: 'Reduced annotation cost by 60% through an active-learning pipeline that prioritised uncertain examples — cutting labelling hours from 400 to 160 for equivalent model quality.',
    postingReference: 'We value efficient use of our annotation and labeling budget',
    backgroundReference: 'cut annotation cost by 60% by prioritising the most uncertain examples for human review',
    approved: false,
    edited: false,
  },
  {
    id: 'exp-3',
    section: 'Experience',
    text: 'Collaborated with PM and engineering leads on a bi-weekly release cycle — defining evaluation metrics jointly and shipping three consecutive model improvements.',
    postingReference: 'Work closely with product and engineering on evaluation criteria and release cycles',
    backgroundReference: 'Collaborated with the PM and two engineering leads on a bi-weekly release cadence',
    approved: false,
    edited: false,
  },
  {
    id: 'res-1',
    section: 'Research',
    text: 'Published 4 papers on low-resource NLP at ACL and EMNLP; lead paper cited 230+ times within two years of publication.',
    postingReference: 'publications at venues like ACL, EMNLP, or NeurIPS are a strong plus',
    backgroundReference: '"Efficient Active Learning for Low-Resource NER", ACL 2021 (cited 230+ times)',
    approved: false,
    edited: false,
  },
  {
    id: 'skl-1',
    section: 'Skills',
    text: 'Python · PyTorch · HuggingFace Transformers · AWS (Lambda, S3, SageMaker) · Docker · SQL · Git',
    postingReference: 'Strong Python skills and experience with PyTorch and the HuggingFace ecosystem',
    backgroundReference: 'Python, PyTorch, HuggingFace Transformers, AWS (Lambda, S3, SageMaker), Docker, SQL, Git',
    approved: false,
    edited: false,
  },
]
