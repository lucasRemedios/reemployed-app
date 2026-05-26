// App.tsx — the root component.
// In React, a "component" is just a function that returns UI (JSX).
// JSX looks like HTML but it's actually TypeScript — you can embed logic in {}.
// This file will grow a lot in later phases; for now it's just a placeholder.

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="logo">ReEmployed</h1>
        <p className="tagline">Paste a job. Get a tailored resume grounded in your truth.</p>
      </header>
      <main className="app-main">
        <p className="placeholder-note">
          Phase 0 — server is running. UI coming in Phase 2.
        </p>
      </main>
    </div>
  )
}

export default App
