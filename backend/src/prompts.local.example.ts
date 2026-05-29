// prompts.local.example.ts — template for prompts.local.ts
//
// Copy this file to prompts.local.ts and fill in your prompts.
// prompts.local.ts is gitignored and will never be pushed to GitHub.
//
//   cp backend/src/prompts.local.example.ts backend/src/prompts.local.ts

export const STAGE_1_SYSTEM = `<your Stage 1 system prompt here>`

export const STAGE_1_USER = (jobPosting: string) =>
  `<your Stage 1 user prompt here>\n\n${jobPosting}`

export const STAGE_2_SYSTEM = `<your Stage 2 system prompt here>`

export const STAGE_2_USER = (
  jobPosting: string,
  background: string,
  strategy: object,
) => `<your Stage 2 user prompt here>\n\n${jobPosting}\n\n${background}\n\n${JSON.stringify(strategy)}`
