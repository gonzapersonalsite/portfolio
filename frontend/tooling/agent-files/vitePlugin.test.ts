import { createServer as createHttpServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { build, createServer } from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'
import { buildAgentFiles } from './generate.ts'
import { absoluteUrl, htmlFileOf, ROUTES } from './routes.ts'

// The real configuration: removing the plugin from vite.config.ts turns these cases red.
const ROOT = join(import.meta.dirname, '..', '..')
const CONFIG_FILE = join(ROOT, 'vite.config.ts')
const VITE_TIMEOUT_MS = 60_000
const REQUEST_TIMEOUT_MS = 5_000

const decode = (source: string | Uint8Array): string =>
  typeof source === 'string' ? source : new TextDecoder().decode(source)

const metaContent = (html: string, attribute: 'name' | 'property', name: string): string | undefined =>
  new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`, 'g').exec(html)?.[1]

async function buildAssetsInMemory(): Promise<Map<string, string>> {
  const result = await build({ root: ROOT, configFile: CONFIG_FILE, logLevel: 'silent', build: { write: false } })
  const assets = new Map<string, string>()

  for (const output of Array.isArray(result) ? result : [result]) {
    if (!('output' in output)) {
      throw new Error('vite build returned a watcher instead of its output')
    }

    for (const chunk of output.output) {
      if (chunk.type === 'asset') {
        assets.set(chunk.fileName, decode(chunk.source))
      }
    }
  }

  return assets
}

async function startDevServer(): Promise<string> {
  const vite = await createServer({
    root: ROOT,
    configFile: CONFIG_FILE,
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, watch: null },
  })

  onTestFinished(() => vite.close())

  const http = createHttpServer(vite.middlewares)
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve))
  onTestFinished(() => new Promise<void>((resolve) => http.close(() => resolve())))

  return `http://127.0.0.1:${(http.address() as AddressInfo).port}`
}

describe('agentFilesPlugin in vite.config.ts', () => {
  it(
    'emits_the_agent_files_and_route_shells_when_the_real_build_runs',
    async () => {
      const assets = await buildAssetsInMemory()

      for (const file of buildAgentFiles()) {
        expect(assets.get(file.path.slice(1)), file.path).toBe(file.source)
      }

      for (const route of ROUTES) {
        const path = htmlFileOf(route)
        const shell = assets.get(path) ?? ''

        expect(shell, path).not.toBe('')
        expect(shell, path).toContain(`<link rel="canonical" href="${absoluteUrl(route.path)}">`)
        expect(metaContent(shell, 'property', 'og:url'), path).toBe(absoluteUrl(route.path))
      }

      expect(assets.get('404.html')).toContain('<meta name="robots" content="noindex">')
    },
    VITE_TIMEOUT_MS,
  )

  it(
    'serves_each_agent_file_with_its_content_type_when_the_dev_server_runs',
    async () => {
      const origin = await startDevServer()

      const responses = await Promise.all(
        buildAgentFiles().map(async (file) => {
          const response = await fetch(`${origin}${file.path}?v=1`, {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          })

          return {
            file,
            status: response.status,
            type: response.headers.get('content-type'),
            body: await response.text(),
          }
        }),
      )

      for (const { file, status, type, body } of responses) {
        expect({ status, type, body }, file.path).toEqual({ status: 200, type: file.contentType, body: file.source })
      }
    },
    VITE_TIMEOUT_MS,
  )
})
