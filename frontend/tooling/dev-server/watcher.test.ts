// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { expect, it, onTestFinished, vi } from 'vitest'

// The real configuration, over a root of its own: removing the store from what
// vite.config.ts tells the watcher to ignore turns this case red.
const CONFIG_FILE = join(import.meta.dirname, '..', '..', 'vite.config.ts')
const VITE_TIMEOUT_MS = 60_000
const WATCHER_TIMEOUT_MS = 10_000

// The store first and shallow, the source last and deep: once the watcher has
// reached the source it has already walked past the store.
const STORE = join('.pnpm-store', 'v11', 'files')
const SOURCE = join('src', 'app', 'styles')

function rootWithAStoreInside(): string {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-watcher-'))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))

  for (const folder of [STORE, SOURCE]) {
    mkdirSync(join(root, folder), { recursive: true })
    writeFileSync(join(root, folder, 'file'), '')
  }

  return root
}

it(
  'does_not_watch_a_package_store_left_inside_the_root_of_the_dev_server',
  async () => {
    const root = rootWithAStoreInside()
    const vite = await createServer({
      root,
      configFile: CONFIG_FILE,
      logLevel: 'silent',
      optimizeDeps: { noDiscovery: true },
      server: { middlewareMode: true, hmr: false },
    })
    onTestFinished(() => vite.close())

    const watchedFolders = (): string[] => Object.keys(vite.watcher.getWatched())
    await vi.waitFor(() => expect(watchedFolders()).toContain(join(root, SOURCE)), { timeout: WATCHER_TIMEOUT_MS })

    expect(watchedFolders().filter((folder) => folder.includes('.pnpm-store'))).toEqual([])
  },
  VITE_TIMEOUT_MS,
)
