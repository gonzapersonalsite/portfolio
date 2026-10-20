import { describe, expect, it } from 'vitest'
import { buildAgentFiles } from './generate'
import { absoluteUrl, LOCALES, localizedPath, ROUTES, twinPathOf } from './routes'

const LINK_PATTERN = /\]\(([^)]+)\)/g

describe('buildAgentFiles', () => {
  it('covers the well-known files and both twins of every route', () => {
    const files = buildAgentFiles()
    const paths = files.map((file) => file.path)

    expect(paths).toContain('/llms.txt')
    expect(paths).toContain('/robots.txt')
    expect(paths).toContain('/sitemap.xml')

    for (const route of ROUTES) {
      expect(paths).toContain(twinPathOf(route, 'en'))
      expect(paths).toContain(twinPathOf(route, 'es'))
    }

    expect(new Set(paths).size).toBe(paths.length)
  })

  it('only emits internal links that resolve to a generated file', () => {
    const files = buildAgentFiles()
    const generated = new Set(files.map((file) => file.path))

    for (const file of files) {
      for (const match of file.source.matchAll(LINK_PATTERN)) {
        const target = match[1]
        if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('mailto:')) {
          continue
        }
        expect(generated.has(target), `${file.path} links to missing ${target}`).toBe(true)
      }
    }
  })

  it('publishes every route in the sitemap and points robots.txt at it', () => {
    const files = new Map(buildAgentFiles().map((file) => [file.path, file.source]))
    const sitemap = files.get('/sitemap.xml') ?? ''

    for (const locale of LOCALES) {
      for (const route of ROUTES) {
        expect(sitemap).toContain(`<loc>${absoluteUrl(localizedPath(route.path, locale))}</loc>`)
      }
    }

    expect(files.get('/robots.txt')).toContain(`Sitemap: ${absoluteUrl('/sitemap.xml')}`)
  })

  it('is deterministic', () => {
    expect(buildAgentFiles()).toEqual(buildAgentFiles())
  })
})
