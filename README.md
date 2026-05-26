# ReEmployed

Paste a job posting + your full background → get a tailored resume, grounded line by line in what you've actually done.

## Prerequisites

- Node.js v18+ (`node --version` to check)
- npm (comes with Node)

## Setup (first time only)

```bash
# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

## Running locally

You need **two terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → Server running at http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → App running at http://localhost:5173
```

Then open http://localhost:5173 in your browser.

## Environment variables

Copy `.env.example` to `.env` and fill in your API key before using the LLM features (Phase 4+).

## Project structure

```
reemployed/
├── frontend/   React + TypeScript UI (Vite dev server)
├── backend/    Node.js + Express API server
├── .env        API keys — gitignored, never committed
└── README.md
```
