// matchText.ts — finds the best-matching span in a source text for a reference string.
//
// Used by the hover-highlight feature. The reference comes from the LLM and may
// be paraphrased rather than verbatim, so we can't rely on exact string matching.
//
// Strategy (in order):
//   1. Exact substring match              — instant, zero false positives
//   2. Case-insensitive exact match       — handles casing drift
//   3. Fuzzy: score every line (and every
//      adjacent line pair) by meaningful-
//      word overlap, return the best one   — handles paraphrase

export interface TextSpan {
  start: number   // character index in the source string
  end:   number
}

// Words too common to be useful for scoring
const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','can','this','that','these','those',
  'it','its','we','our','they','their','you','your','from','as','by','not',
  'also','which','who','what','how','when','where','than','more','into',
])

// Lowercase, strip punctuation, split into words, remove stopwords & short words
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
}

// Score a candidate chunk: what fraction of the reference's meaningful words
// appear in the chunk? (recall-focused: we want to find the chunk that
// contains the most of what the reference is talking about)
function score(chunkText: string, refTokenSet: Set<string>, refLen: number): number {
  if (refLen === 0) return 0
  const chunkTokens = tokenize(chunkText)
  const overlap = chunkTokens.filter(t => refTokenSet.has(t)).length
  return overlap / refLen
}

export function findBestMatch(source: string, reference: string): TextSpan | null {
  if (!reference.trim() || !source.trim()) return null

  // ── 1. Exact match ──────────────────────────────────────────────────────────
  const exactIdx = source.indexOf(reference)
  if (exactIdx !== -1) {
    return { start: exactIdx, end: exactIdx + reference.length }
  }

  // ── 2. Case-insensitive exact match ─────────────────────────────────────────
  const ciIdx = source.toLowerCase().indexOf(reference.toLowerCase())
  if (ciIdx !== -1) {
    return { start: ciIdx, end: ciIdx + reference.length }
  }

  // ── 3. Fuzzy line-based match ────────────────────────────────────────────────
  const refTokens    = tokenize(reference)
  if (refTokens.length === 0) return null
  const refTokenSet  = new Set(refTokens)
  const refLen       = refTokens.length

  // Build an array of { text, start, end } for every line in the source
  type Chunk = { text: string; start: number; end: number }
  const lines: Chunk[] = []
  let pos = 0
  for (const line of source.split('\n')) {
    lines.push({ text: line, start: pos, end: pos + line.length })
    pos += line.length + 1  // +1 for the '\n'
  }

  // Candidate pool: individual lines + adjacent pairs
  // (references sometimes span a sentence that wraps across two lines)
  const candidates: Array<Chunk & { sc: number }> = []

  for (const line of lines) {
    if (line.text.trim().length < 8) continue
    candidates.push({ ...line, sc: score(line.text, refTokenSet, refLen) })
  }

  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i], b = lines[i + 1]
    if (a.text.trim().length < 5 && b.text.trim().length < 5) continue
    const combined = a.text + '\n' + b.text
    candidates.push({
      text:  combined,
      start: a.start,
      end:   b.end,
      sc:    score(combined, refTokenSet, refLen),
    })
  }

  if (candidates.length === 0) return null

  const best = candidates.reduce((a, b) => (b.sc > a.sc ? b : a))

  // Require at least one meaningful word in common — a zero-overlap match
  // would scroll to a random line, which is worse than doing nothing
  if (best.sc === 0) return null

  return { start: best.start, end: best.end }
}
