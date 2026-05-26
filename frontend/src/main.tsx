import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Find the <div id="root"> in index.html and mount our React app into it.
// StrictMode runs checks in development only — it helps catch subtle bugs
// by rendering components twice. Has zero effect in production.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
