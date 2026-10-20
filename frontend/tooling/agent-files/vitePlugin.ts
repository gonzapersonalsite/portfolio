import type { Plugin } from 'vite'
import { buildAgentFiles } from './generate.ts'
import { HOME_ROUTE, htmlFileOf, LOCALES, ROUTES } from './routes.ts'
import { buildNotFoundPage, buildRouteShell } from './shell.ts'

// Vercel serves this file, with status 404, for any address that matches no file.
const NOT_FOUND_FILE = '404.html'
const decodeAssetSource = (source: string | Uint8Array): string =>
  typeof source === 'string' ? source : new TextDecoder().decode(source)

export function agentFilesPlugin(): Plugin {
  return {
    name: 'portfolio-agent-files',
    enforce: 'post',
    configureServer(server) {
      const files = new Map(buildAgentFiles().map((file) => [file.path, file]))

      server.middlewares.use((request, response, next) => {
        const path = (request.url ?? '').split('?')[0]
        const file = files.get(path)
        if (file === undefined) {
          next()
          return
        }

        response.setHeader('Content-Type', file.contentType)
        response.end(file.source)
      })
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (index === undefined || index.type !== 'asset') {
        throw new Error('agent-files: index.html asset not found in the bundle')
      }

      // Every shell starts from the built index.html (with its script, style and font tags).
      const template = decodeAssetSource(index.source)
      index.source = buildRouteShell(template, HOME_ROUTE, 'es')

      for (const locale of LOCALES) {
        for (const route of ROUTES) {
          if (locale === 'es' && route.id === HOME_ROUTE.id) continue

          this.emitFile({
            type: 'asset',
            fileName: htmlFileOf(route, locale),
            source: buildRouteShell(template, route, locale),
          })
        }
      }

      this.emitFile({ type: 'asset', fileName: NOT_FOUND_FILE, source: buildNotFoundPage(template) })

      for (const file of buildAgentFiles()) {
        this.emitFile({
          type: 'asset',
          fileName: file.path.slice(1),
          source: file.source,
        })
      }
    },
  }
}
