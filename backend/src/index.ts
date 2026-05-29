// index.ts — Express server entry point.

// config MUST be first: it calls dotenv.config() before any other module
// reads process.env (prompts.ts reads env vars at load time).
import './config'

import express    from 'express'
import cors       from 'cors'
import { tailorHandler }  from './routes/tailor'
import { exportHandler }  from './routes/export'
import { optionalAuth }   from './middleware/auth'

const app  = express()
const PORT = process.env.PORT ?? 3001

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Main pipeline: job posting + background → tailored resume.
// optionalAuth extracts req.userId when a valid Bearer token is present;
// unauthenticated requests pass through and the pipeline still runs.
app.post('/api/tailor',  optionalAuth, tailorHandler)

// Export: approved lines → .docx file download
app.post('/api/export',  exportHandler)

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Backend running at http://localhost:${PORT}`)
  console.log(`    Groq model: ${process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'}`)
})
