// index.ts — Express server entry point.

import express    from 'express'
import cors       from 'cors'
import dotenv     from 'dotenv'
import { tailorHandler } from './routes/tailor'

dotenv.config({ path: '../../.env' })

const app  = express()
const PORT = process.env.PORT ?? 3001

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Main pipeline: job posting + background → tailored resume
app.post('/api/tailor', tailorHandler)

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Backend running at http://localhost:${PORT}`)
  console.log(`    Groq model: ${process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'}`)
})
