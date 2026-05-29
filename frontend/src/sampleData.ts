// sampleData.ts
//
// Exports:
//   SAMPLE_JOB_POSTING   — pre-fills the left textarea
//   SAMPLE_BACKGROUND    — pre-fills the middle textarea
//   SAMPLE_RESUME_DATA   — seeds the right column (structured UIResumeData)
//
// postingReference and backgroundReference must be verbatim substrings of
// the corresponding sample text — the highlight overlay does a literal search.

import type { UIResumeData, UIField, UIExperienceEntry, UIEducationEntry } from './types'

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

export const SAMPLE_BACKGROUND = `John Doe
john.doe@gmail.com
555-555-5555
github.com/johndoe


PhD, Natural Language Processing — Stanford University, 2023
Dissertation: Low-Resource Sequence Modeling under Constrained Supervision

Masters in CS from ohio state

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

Industry: Applied Scientist, Loreston Corp (2021–2023)
Implemented and debugged for NLP and LLM systems

Technical skills
Python, PyTorch, HuggingFace Transformers, AWS (Lambda, S3, SageMaker), Docker, SQL, Git`

// ── Sample resume data (UIResumeData) ─────────────────────────────────────────

function field(
  id:                  string,
  text:                string,
  postingReference:    string[] = [],
  backgroundReference: string[] = [],
): UIField {
  return { id, text, approved: false, edited: false, postingReference, backgroundReference }
}

export const SAMPLE_RESUME_DATA: UIResumeData = {
  personalDetails: {
    name:          field('pd-name',     'John Doe',             [], ['John Doe']),
    email:         field('pd-email',    'john.doe@gmail.com',   [], ['john.doe@gmail.com']),
    phone:         field('pd-phone',    '555-555-5555',         [], ['555-555-5555']),
    location:      field('pd-location', ''),
    website:       field('pd-website',  ''),
    linkedin:      field('pd-linkedin', ''),
    github:        field('pd-github',   'github.com/johndoe',   [], ['github.com/johndoe']),
    googleScholar: field('pd-scholar',  ''),
  },

  summary: field(
    'sum-0',
    'NLP researcher and engineer with experience spanning PhD-level modeling, production systems serving millions of users, and cross-functional collaboration.',
    [
      'move from research idea to shipped feature',
      'Deploy and monitor ML models serving millions of daily requests',
    ],
    [
      'PhD, Natural Language Processing — Stanford University, 2023',
      'ship it on AWS Lambda with int8 quantization — 2M daily requests, under 40ms p99 latency',
    ],
  ),

  experience: [
    ((): UIExperienceEntry => ({
      id:           'exp-0',
      title:        field('exp-0-title', 'Applied Scientist'),
      organization: field('exp-0-org',   'Acme Corp'),
      dates:        field('exp-0-dates',  '2021–2023'),
      description:  field(
        'exp-0-desc',
        'Designed and shipped a BERT-based content moderation classifier handling 2M daily requests at under 40ms p99 latency on AWS Lambda.\nReduced annotation cost by 60% through an active-learning pipeline that prioritised uncertain examples — cutting labelling hours from 400 to 160 for equivalent model quality.\nCollaborated with PM and engineering leads on a bi-weekly release cycle — defining evaluation metrics jointly and shipping three consecutive model improvements.',
        [
          'Experience deploying ML models to production at scale',
          'We value efficient use of our annotation and labeling budget',
          'Work closely with product and engineering on evaluation criteria and release cycles',
        ],
        [
          'ship it on AWS Lambda with int8 quantization — 2M daily requests, under 40ms p99 latency',
          'cut annotation cost by 60% by prioritising the most uncertain examples for human review',
          'Collaborated with the PM and two engineering leads on a bi-weekly release cadence',
        ],
      ),
    }))(),
    ((): UIExperienceEntry => ({
      id:           'exp-1',
      title:        field('exp-1-title', 'Applied Scientist'),
      organization: field('exp-1-org',   'Loreston Corp'),
      dates:        field('exp-1-dates',  '2021–2023'),
      description:  field(
        'exp-1-desc',
        'Implemented and debugged NLP and LLM systems.',
        ['Design and run experiments on large-scale NLP and LLM systems'],
        ['Implemented and debugged for NLP and LLM systems'],
      ),
    }))(),
  ],

  education: [
    ((): UIEducationEntry => ({
      id:          'edu-0',
      degree:      field('edu-0-degree',  'PhD, Natural Language Processing'),
      institution: field('edu-0-inst',    'Stanford University'),
      dates:       field('edu-0-dates',   '2023'),
      advisor:     field('edu-0-advisor', ''),
      details:     field('edu-0-details', 'Dissertation: Low-Resource Sequence Modeling under Constrained Supervision'),
    }))(),
    ((): UIEducationEntry => ({
      id:          'edu-1',
      degree:      field('edu-1-degree',  'Masters in CS'),
      institution: field('edu-1-inst',    'Ohio State'),
      dates:       field('edu-1-dates',   ''),
      advisor:     field('edu-1-advisor', ''),
      details:     field('edu-1-details', ''),
    }))(),
  ],

  research: [
    field(
      'res-0',
      'Published 4 papers on low-resource NLP at ACL and EMNLP; lead paper cited 230+ times within two years of publication.',
      [
        'publications at venues like ACL, EMNLP, or NeurIPS are a strong plus',
        'Engage with the academic literature and bring relevant ideas into production',
      ],
      [
        '"Efficient Active Learning for Low-Resource NER", ACL 2021 (cited 230+ times)',
      ],
    ),
  ],

  skills: [
    field(
      'skl-0',
      'Python · PyTorch · HuggingFace Transformers · AWS (Lambda, S3, SageMaker) · Docker · SQL · Git',
      ['Strong Python skills and experience with PyTorch and the HuggingFace ecosystem'],
      ['Python, PyTorch, HuggingFace Transformers, AWS (Lambda, S3, SageMaker), Docker, SQL, Git'],
    ),
  ],

  additional: [],
}
