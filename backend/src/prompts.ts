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
      "postingReference": [
        "Verbatim excerpt from the job posting that this line addresses.",
        "A second verbatim excerpt if this line responds to more than one requirement."
      ],
      "backgroundReference": [
        "Verbatim excerpt from the background that grounds this line.",
        "A second verbatim excerpt if this line draws on more than one experience or fact."
      ],
      "section": "One of: Summary, Experience, Research, Education, Skills"
    }
  ]
}

Rules:
1. Only use information from the candidate's background. Do not invent anything.
2. Every string in postingReference must be copied verbatim (word-for-word) from the job posting.
3. Every string in backgroundReference must be copied verbatim (word-for-word) from the background.
4. Include ALL posting requirements and background facts that contributed to each line — not just one.
   A line that addresses two requirements should have two entries in postingReference.
5. Include: 1 Summary line, 3–5 Experience bullets, relevant Research/Education/Skills lines.
6. Make lines specific and concrete — avoid generic phrases like "strong communicator."
7. Order lines logically: Summary → Experience → Research → Education → Skills.

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
