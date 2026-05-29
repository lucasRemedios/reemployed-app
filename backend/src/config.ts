// config.ts — must be the first import in index.ts.
//
// Calls dotenv.config() before any other module reads process.env.
// Without this, modules that read env vars at load time (e.g. prompts.ts)
// would see empty values because imports are resolved before any inline code runs.

import dotenv from 'dotenv'

// Path is relative to process.cwd() = backend/ when running locally.
// In production (Docker / Render) the .env file won't exist — env vars are
// injected directly by the platform, so dotenv.config() is a no-op there.
dotenv.config({ path: '../.env' })
