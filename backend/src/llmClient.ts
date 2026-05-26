// llmClient.ts — the swappable LLM module.
//
// This is the ONLY file that knows which LLM provider we're using.
// Every other file calls the functions exported here.
// To switch from Grok to Claude (or any other provider), you rewrite
// only this file — the rest of the codebase is untouched.
//
// The interface contract (what callers can count on):
//   callLLM(prompt: string): Promise<string>
//     → send a prompt, get back the raw text response.
//
// Phase 4 will implement this for real. For now it's a stub that
// returns a placeholder so the rest of the code can be wired up
// against the interface without needing a live API key yet.

export async function callLLM(prompt: string): Promise<string> {
  // TODO (Phase 4): replace this stub with the real Grok API call.
  console.log('[llmClient] callLLM called (stub). Prompt length:', prompt.length)
  return '[LLM stub response — not yet implemented]'
}
