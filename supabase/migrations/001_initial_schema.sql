-- 001_initial_schema.sql
--
-- Initial schema for ReEmployed.
--
-- Table overview:
--   users        — public mirror of auth.users; one row per authenticated user.
--   resume_runs  — one row per LLM pipeline call (job posting + both stage outputs).
--   feedback     — one row per bullet-level thumbs up/down rating.
--
-- Notes:
--   • All primary keys are UUIDs generated server-side.
--   • users.id is a FK to auth.users(id) so the two stay in sync.
--   • Row Level Security is enabled on every table. The backend uses the
--     service role key which bypasses RLS, so no policies are needed for
--     server-side writes. Add user-facing policies here when building a
--     client-side dashboard.
--   • feedback.rating: TRUE = thumbs up, FALSE = thumbs down.

-- ── users ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email       TEXT        UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ── resume_runs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.resume_runs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  job_posting    TEXT        NOT NULL,
  stage1_output  JSONB       NOT NULL DEFAULT '{}',
  stage2_output  JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resume_runs_user_id_idx ON public.resume_runs (user_id);

ALTER TABLE public.resume_runs ENABLE ROW LEVEL SECURITY;

-- ── feedback ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feedback (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  resume_run_id  UUID        NOT NULL REFERENCES public.resume_runs (id) ON DELETE CASCADE,
  bullet_text    TEXT        NOT NULL,
  rating         BOOLEAN     NOT NULL,   -- TRUE = thumbs up, FALSE = thumbs down
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_user_id_idx      ON public.feedback (user_id);
CREATE INDEX IF NOT EXISTS feedback_resume_run_id_idx ON public.feedback (resume_run_id);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
