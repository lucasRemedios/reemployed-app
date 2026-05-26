import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite is the dev server and build tool for the frontend.
// The proxy block below means: any request the frontend makes to /api/...
// gets silently forwarded to the backend at port 3001.
// This keeps the frontend code clean — it never hard-codes a server URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
