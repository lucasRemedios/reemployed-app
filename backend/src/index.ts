// index.ts — the Express server entry point.
//
// Express works by registering "route handlers": functions that run when
// a request arrives at a specific path (e.g. GET /health, POST /api/tailor).
// Each handler receives a Request object (req) and a Response object (res).
// You read from req, do your work, and write back via res.

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// dotenv reads the .env file at the project root and loads its key=value
// pairs into process.env so the rest of the code can access them safely.
dotenv.config({ path: '../../.env' })

const app = express()
const PORT = process.env.PORT ?? 3001

// ── Middleware ──────────────────────────────────────────────────────────────
// Middleware runs on every request before it reaches a route handler.

// cors: Allow requests from the Vite dev server (localhost:5173).
// In production you'd restrict this to your actual domain.
app.use(cors({ origin: 'http://localhost:5173' }))

// express.json(): Parse incoming request bodies as JSON automatically.
// Without this, req.body would be undefined.
app.use(express.json())

// ── Routes ──────────────────────────────────────────────────────────────────

// Health check — a simple endpoint to confirm the server is alive.
// curl http://localhost:3001/health → { "status": "ok" }
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Main endpoint — stubbed for now, wired to the LLM in Phase 4.
app.post('/api/tailor', (_req, res) => {
  res.json({ message: 'LLM pipeline not yet wired — coming in Phase 4.' })
})

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅  Backend running at http://localhost:${PORT}`)
  console.log(`    Health check: http://localhost:${PORT}/health`)
})
