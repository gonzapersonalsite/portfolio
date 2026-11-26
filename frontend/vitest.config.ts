import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // The '@/' alias lives in tsconfig.app.json only: Vitest reads it from there.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: 'jsdom',
    css: true,
    // A test that checks nothing fails instead of passing in silence.
    expect: { requireAssertions: true },
    // A committed .only would skip the rest of the suite in silence; skip and todo are the lint's.
    allowOnly: false,
  },
})
