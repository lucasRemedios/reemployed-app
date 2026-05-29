// supabaseClient.ts — the ONLY file that knows about Supabase.
//
// Uses the SERVICE ROLE KEY — this client has full database access and
// bypasses Row Level Security. Never expose it to the frontend.
//
// Lazy singleton: client is created on first call to getSupabase(), not at
// import time. This matches the llmClient.ts pattern: dotenv.config() in
// index.ts runs before any route handler, so env vars are always set by the
// time getSupabase() is first called.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url) throw new Error('SUPABASE_URL is not set — add it to your .env file.')
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — add it to your .env file.')

    _client = createClient(url, key, {
      auth: {
        // Server-side client: no browser session persistence or token refresh.
        autoRefreshToken: false,
        persistSession:   false,
      },
    })
  }
  return _client
}
