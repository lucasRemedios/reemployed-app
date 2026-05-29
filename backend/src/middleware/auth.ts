// middleware/auth.ts — Supabase JWT verification.
//
// Exports two middlewares:
//
//   optionalAuth  — verifies token if present, attaches req.userId if valid,
//                   but never blocks the request. Use on endpoints that work
//                   for both guests and authenticated users (e.g. /api/tailor).
//
//   requireAuth   — returns 401 if no valid token is present. Use on endpoints
//                   that must be authenticated (e.g. future /api/feedback).
//
// Both middlewares attach req.userId (string) when a valid JWT is found.
// The userId is the Supabase auth user UUID — it matches auth.users.id.

import { Request, Response, NextFunction } from 'express'
import { getSupabase } from '../supabaseClient'

// ── Extend Express Request with userId ───────────────────────────────────────
// Global augmentation so req.userId is typed in every route file without
// needing an explicit import.
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

async function verifyToken(token: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

// ── optionalAuth ──────────────────────────────────────────────────────────────

export async function optionalAuth(
  req:  Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req)
  if (token) {
    try {
      const userId = await verifyToken(token)
      if (userId) req.userId = userId
    } catch (err) {
      // Non-fatal — log and continue without userId
      console.warn('[auth] optionalAuth token error:', err instanceof Error ? err.message : err)
    }
  }
  next()
}

// ── requireAuth ───────────────────────────────────────────────────────────────

export async function requireAuth(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Authorization header with Bearer token is required.' })
    return
  }

  try {
    const userId = await verifyToken(token)
    if (!userId) {
      res.status(401).json({ error: 'Invalid or expired token.' })
      return
    }
    req.userId = userId
    next()
  } catch (err) {
    console.error('[auth] requireAuth error:', err instanceof Error ? err.message : err)
    res.status(401).json({ error: 'Token verification failed.' })
  }
}
