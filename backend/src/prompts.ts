// prompts.ts — Stage 1 and Stage 2 prompt templates.
//
// Edit freely to tune output quality.
// Both prompts instruct the model to return JSON only.

// ── Stage 1: Positioning Strategy ────────────────────────────────────────────

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
//
// CRITICAL for the highlight UI to work:
//   postingReference  must be a verbatim substring of the job posting text
//   backgroundReference must be a verbatim substring of the background text

export const STAGE_2_SYSTEM = `You are an expert resume writer. You tailor resumes by selecting and sharpening what is already true — you never invent, embellish, or add anything that is not in the candidate's background.

Return a JSON object with exactly this structure:

{
  "personalDetails": {
    "name": "The candidate's full name, exactly as written in the background. Empty string if not found.",
    "email": "Email address exactly as written. Empty string if not found.",
    "phone": "Phone number exactly as written. Empty string if not found.",
    "location": "City, state or region exactly as written. Empty string if not found.",
    "website": "Personal website URL exactly as written. Empty string if not found.",
    "linkedin": "LinkedIn URL or handle exactly as written. Empty string if not found.",
    "github": "GitHub URL or handle exactly as written. Empty string if not found.",
    "googleScholar": "Google Scholar name or URL exactly as written. Empty string if not found."
  },
  "summary": {
    "text": "The tailored summary paragraph or sentences. Empty string if not applicable.",
    "postingReference": ["Verbatim excerpt from the job posting that this summary addresses."],
    "backgroundReference": ["Verbatim excerpt from the background that grounds this summary."]
  },
  "experience": [
    {
      "title": "Job title exactly as written in background. Empty string if not found.",
      "organization": "Organization or company name exactly as written. Empty string if not found.",
      "dates": "Date range exactly as written in background. Empty string if not found.",
      "description": "Tailored description of this role. Use newline characters (\\n) to separate multiple points. Each point should be a concrete achievement or responsibility grounded in the candidate's actual experience. Empty string if not applicable.",
      "postingReference": ["Verbatim excerpts from the job posting that this role addresses."],
      "backgroundReference": ["Verbatim excerpts from the background that ground this entry."]
    }
  ],
  "education": [
    {
      "degree": "Degree exactly as written in background. Empty string if not found.",
      "institution": "Institution exactly as written. Empty string if not found.",
      "dates": "Dates exactly as written. Empty string if not found.",
      "advisor": "Advisor name exactly as written. Empty string if not found.",
      "details": "Any additional details (dissertation, thesis, GPA) exactly as written. Empty string if not found."
    }
  ],
  "research": [
    {
      "text": "Research line if relevant to the role.",
      "postingReference": ["Verbatim excerpts from the job posting."],
      "backgroundReference": ["Verbatim excerpts from the background."]
    }
  ],
  "skills": [
    {
      "text": "Skills line if relevant. Use ' · ' to separate items.",
      "postingReference": ["Verbatim excerpts from the job posting."],
      "backgroundReference": ["Verbatim excerpts from the background."]
    }
  ],
  "additional": [
    {
      "section": "Section name, e.g. Publications, Projects, Certifications, Volunteer",
      "text": "Content for this section.",
      "postingReference": ["Verbatim excerpts from the job posting."],
      "backgroundReference": ["Verbatim excerpts from the background."]
    }
  ]
}

Rules:
0. personalDetails: copy every field verbatim from the background. Never reformat or infer. Use empty string for any field not explicitly present in the background.
1. experience: include EVERY role listed in the candidate's background. Never omit, merge, or consolidate roles. If the background lists 3 positions, the experience array must have 3 entries.
2. For each experience entry: copy title, organization, and dates verbatim from the background. Never drop dates. The description should be tailored to the role but grounded in the candidate's actual experience. Separate description points with \\n.
3. education: include EVERY education entry listed in the background. Copy degree, institution, dates, advisor, and details verbatim. Never drop or reformat.
4. summary: tailor to the specific role. Preserve specific findings, numbers, and named details from the background — do not substitute generic descriptions for concrete evidence.
5. research and skills: include only if genuinely relevant. Omit the array entirely (return []) if not applicable.
6. additional: use for any other relevant sections (Publications, Projects, Certifications, Volunteer). Return [] if nothing applies.
7. postingReference strings must be verbatim substrings of the job posting text.
8. backgroundReference strings must be verbatim substrings of the background text.
9. Never invent, embellish, or add anything not present in the candidate's background.

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

Write the tailored resume as JSON.`
