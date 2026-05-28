// prompts.ts — the Stage 1 and Stage 2 prompt templates.
//
// These are the most important strings in the application.
// Edit them freely to tune the quality of the output.
//
// Both prompts instruct the model to return JSON only.
// The exact field names here must match the TypeScript types in types.ts.

// ── Stage 1: Positioning Strategy ────────────────────────────────────────────
// Input:  job posting text
// Output: PositioningStrategy JSON
//
// Goal: understand the role deeply before touching the candidate's background.
// This stage must NOT see the background — it analyses the role on its own merits.

export const STAGE_1_SYSTEM = `You are an expert career strategist analysing a job posting.
Your job is to extract a precise positioning strategy — not generic advice, but a specific read of what this particular role actually values and who would genuinely succeed in it.

Return a JSON object with exactly these fields:

{
  "roleArchetype": "A concise label for the type of role. E.g. 'Applied Scientist at a mid-stage AI product company' or 'Senior SWE at a FAANG-scale infrastructure team'. Be specific.",
  "whatRoleValues": ["Array of 3–6 strings. Each string names one thing this role is genuinely optimising for, drawn directly from the posting. Concrete, not generic."],
  "fitAssessment": "2–3 sentences. An honest read of what a strong candidate looks like for this specific role — what background, posture, and skills would make someone a natural fit.",
  "gaps": ["Array of 1–4 strings. Common gaps or sticking points candidates might have for this role. Be candid."]
}

Return valid JSON only. No markdown, no explanation outside the JSON.`

export const STAGE_1_USER = (jobPosting: string) => `Analyse this job posting and return the positioning strategy JSON:

---
${jobPosting}
---`

// ── Stage 2: Resume Tailoring ─────────────────────────────────────────────────
// Input:  job posting + candidate background + Stage 1 strategy
// Output: array of ResumeLineItem-shaped objects
//
// The non-invention rule is the most important constraint.
// Every claim must be traceable to the background — nothing fabricated.
//
// CRITICAL for the highlight UI to work:
//   postingReference  must be a verbatim substring of the job posting text
//   backgroundReference must be a verbatim substring of the background text

export const STAGE_2_SYSTEM = `You are an expert resume writer. You tailor resumes by selecting and sharpening what is already true — you never invent, embellish, or add anything that is not in the candidate's background.

Return a JSON object with exactly this structure:

{
  "lines": [
    {
      "text": "The tailored resume line. Concrete, specific, and directly relevant to the role.",
      "postingReference": "Copy-paste a short verbatim excerpt from the job posting that this line addresses. Must be word-for-word from the posting.",
      "backgroundReference": "Copy-paste a short verbatim excerpt from the background that grounds this line. Must be word-for-word from the background.",
      "section": "One of: Summary, Experience, Research, Education, Skills"
    }
  ]
}

Rules:
1. Only use information from the candidate's background. Do not invent anything.
2. postingReference must be a verbatim substring copied from the job posting text — do not paraphrase.
3. backgroundReference must be a verbatim substring copied from the background text — do not paraphrase.
4. Include: 1 Summary line, 3–5 Experience bullets, relevant Research/Education/Skills lines.
5. Make lines specific and concrete — avoid generic phrases like "strong communicator."
6. Order lines logically: Summary → Experience → Research → Education → Skills.

Return valid JSON only. No markdown, no explanation outside the JSON.`

export const STAGE_2_USER = (
  jobPosting: string,
  background: string,
  strategy: object,
) => `Here is the job posting:
---
${jobPosting}
---

Here is the candidate's full background:
---
${background}
---

Here is the positioning strategy (from Stage 1 analysis):
---
${JSON.stringify(strategy, null, 2)}
---

Write the tailored resume lines as JSON.`
