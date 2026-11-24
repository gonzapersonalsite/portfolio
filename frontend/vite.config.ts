import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { agentFilesPlugin } from './tooling/agent-files/vitePlugin.ts'
import { fontPreloadPlugin } from './tooling/font-preload/vitePlugin.ts'
import pkg from './package.json' with { type: 'json' }

// Get current git commit hash
let commitHash = 'unknown'
try {
  commitHash = execSync('git rev-parse --short HEAD', { timeout: 5000 }).toString().trim()
} catch {
  console.warn('Could not get git commit hash, falling back to "unknown".')
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [react(), fontPreloadPlugin(), agentFilesPlugin()],
  // The '@/' alias lives in tsconfig.app.json only: Vite reads it from there.
  resolve: { tsconfigPaths: true },
  // The launcher runs it with --host inside its container (tools/react.sh), and compose.yaml
  // publishes the port on 127.0.0.1 only.
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // React and the router change only on upgrades, so this chunk stays cached across deploys.
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/,
              priority: 20,
            },
            // Only the MUI and Emotion code of the first render ($initial); components used by a
            // single page (Timeline, TextField, Dialog...) stay in that page's chunk.
            {
              name: 'mui-vendor',
              test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
              priority: 10,
              tags: ['$initial'],
            },
          ],
        },
      },
    },
  },
})
