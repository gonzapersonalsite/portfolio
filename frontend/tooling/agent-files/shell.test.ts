import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getProfile } from '../../src/entities/profile/api/profileApi'
import { getAllProjects } from '../../src/entities/project/api/projectApi'
import { projectCoverSources } from '../../src/entities/project/model/projectImages'
import { getCoreSkills } from '../../src/entities/skill/api/skillApi'
import { absoluteUrl, HOME_ROUTE, ROUTES, type RouteSpec } from './routes'
import { buildNotFoundPage, buildRouteShell } from './shell'

// The real template: a marker the shells need cannot disappear from it unnoticed.
const INDEX_HTML = readFileSync(resolve(import.meta.dirname, '../../index.html'), 'utf8')

const routeOf = (id: RouteSpec['id']): RouteSpec => {
  const route = ROUTES.find((candidate) => candidate.id === id)
  if (route === undefined) throw new Error(`no route ${id}`)
  return route
}

const metaContent = (html: string, attribute: 'name' | 'property', name: string): string[] =>
  [...html.matchAll(new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`, 'g'))].map((match) => match[1])

const noScriptContent = (html: string): string =>
  [...html.matchAll(/<noscript>([\s\S]*?)<\/noscript>/g)].map((match) => match[1]).join('\n')

const jpegSize = (source: Buffer): { width: number; height: number } => {
  if (source[0] !== 0xff || source[1] !== 0xd8) {
    throw new Error('expected a JPEG image')
  }

  let offset = 2
  while (offset < source.length) {
    while (source[offset] === 0xff) offset += 1

    const marker = source[offset]
    offset += 1

    if (marker === 0xd9 || marker === 0xda) {
      break
    }

    const segmentLength = source.readUInt16BE(offset)
    if (segmentLength < 2) {
      break
    }

    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
    if (isStartOfFrame) {
      return {
        height: source.readUInt16BE(offset + 3),
        width: source.readUInt16BE(offset + 5),
      }
    }

    offset += segmentLength
  }

  throw new Error('JPEG size marker not found')
}

interface StructuredNode {
  '@type': string
  '@id': string
  [key: string]: unknown
}

const structuredGraph = (html: string): StructuredNode[] => {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  expect(match).not.toBeNull()
  return (JSON.parse(match?.[1] ?? '') as { '@graph': StructuredNode[] })['@graph']
}

describe('buildRouteShell', () => {
  it('writes the home metadata from the home route, not from the index.html placeholders', () => {
    const shell = buildRouteShell(INDEX_HTML, HOME_ROUTE)

    expect(shell).toContain(`<title>${HOME_ROUTE.shellTitle}</title>`)
    expect(metaContent(shell, 'name', 'description')).toEqual([HOME_ROUTE.shellDescription])
    expect(metaContent(shell, 'property', 'og:title')).toEqual([HOME_ROUTE.shellTitle])
    expect(metaContent(shell, 'property', 'og:description')).toEqual([HOME_ROUTE.shellDescription])
    expect(metaContent(shell, 'property', 'og:url')).toEqual(['https://mi-portafolio-gonzalo.vercel.app/'])
  })

  it('gives every route its own title, description, canonical address and og:url, once', () => {
    for (const route of ROUTES) {
      const shell = buildRouteShell(INDEX_HTML, route)

      expect(shell.match(/<title>/g), route.id).toHaveLength(1)
      expect(shell, route.id).toContain(`<title>${route.shellTitle}</title>`)
      expect(metaContent(shell, 'name', 'description'), route.id).toEqual([route.shellDescription])
      expect(shell.match(/rel="canonical"/g), route.id).toHaveLength(1)
      expect(shell, route.id).toContain(`<link rel="canonical" href="${absoluteUrl(route.path)}">`)
      expect(metaContent(shell, 'property', 'og:url'), route.id).toEqual([absoluteUrl(route.path)])
    }
  })

  it('links both markdown twins with symmetric hreflang', () => {
    const shell = buildRouteShell(INDEX_HTML, routeOf('about'))

    expect(shell).toContain(
      '<link rel="alternate" type="text/markdown" hreflang="en" href="https://mi-portafolio-gonzalo.vercel.app/about/index.md">',
    )
    expect(shell).toContain(
      '<link rel="alternate" type="text/markdown" hreflang="es" href="https://mi-portafolio-gonzalo.vercel.app/about/index.es.md">',
    )
    expect(shell).not.toContain('href="https://mi-portafolio-gonzalo.vercel.app/index.md"')
  })

  it('serves one social image by absolute URL, with the same alt text for every platform, and drops tags that promised more than the page has', () => {
    const shell = buildRouteShell(INDEX_HTML, routeOf('projects'))

    for (const image of [
      ...metaContent(shell, 'property', 'og:image'),
      ...metaContent(shell, 'name', 'twitter:image'),
    ]) {
      expect(image.startsWith('https://mi-portafolio-gonzalo.vercel.app/')).toBe(true)
    }
    expect(metaContent(shell, 'property', 'og:image')).toHaveLength(1)
    expect(metaContent(shell, 'name', 'twitter:image')).toEqual(metaContent(shell, 'property', 'og:image'))
    expect(metaContent(shell, 'property', 'og:image:alt')).toHaveLength(1)
    expect(metaContent(shell, 'name', 'twitter:image:alt')).toEqual(metaContent(shell, 'property', 'og:image:alt'))
    expect(shell).not.toContain('<meta name="title"')
    expect(shell).not.toContain('og:locale:alternate')
  })

  it('declares_the_real_width_and_height_of_the_social_image_when_the_shell_is_built', () => {
    const shell = buildRouteShell(INDEX_HTML, HOME_ROUTE)
    const [imagePath] = metaContent(shell, 'property', 'og:image')
    const image = readFileSync(resolve(import.meta.dirname, '../../public', `.${new URL(imagePath).pathname}`))
    const size = jpegSize(image)

    expect(metaContent(shell, 'property', 'og:image:width')).toEqual([String(size.width)])
    expect(metaContent(shell, 'property', 'og:image:height')).toEqual([String(size.height)])
    expect(size).toEqual({ width: 1200, height: 630 })
  })

  it('describes the site and its owner as one structured-data graph', () => {
    const graph = structuredGraph(buildRouteShell(INDEX_HTML, HOME_ROUTE))
    const website = graph.find((node) => node['@type'] === 'WebSite')
    const person = graph.find((node) => node['@type'] === 'Person')

    expect(website).toMatchObject({
      '@id': 'https://mi-portafolio-gonzalo.vercel.app/#website',
      url: 'https://mi-portafolio-gonzalo.vercel.app/',
      inLanguage: ['en', 'es'],
      publisher: { '@id': 'https://mi-portafolio-gonzalo.vercel.app/#person' },
    })
    expect(person).toMatchObject({
      '@id': 'https://mi-portafolio-gonzalo.vercel.app/#person',
      name: 'Gonzalo Martínez',
      alternateName: 'Gonzalo Martínez García',
      jobTitle: 'Junior Full Stack Developer',
      url: 'https://mi-portafolio-gonzalo.vercel.app/',
      homeLocation: { '@type': 'Place', name: getProfile().locationEn },
      knowsAbout: getCoreSkills().map((skill) => skill.nameEn),
    })
    expect(person?.knowsLanguage).toContain('Spanish')
    expect((person?.sameAs as string[]).every((link) => link.startsWith('https://'))).toBe(true)
  })

  it('tells visitors without JavaScript who this is and where the text version is', () => {
    const shell = buildRouteShell(INDEX_HTML, routeOf('experience'))
    const noscript = noScriptContent(shell)

    expect(shell.indexOf('<noscript>')).toBeLessThan(shell.indexOf('<div id="root">'))
    expect(noscript).toContain('<h1>Gonzalo Martínez</h1>')
    expect(noscript).toContain('href="/experience/index.md"')
    expect(noscript).toContain('href="/experience/index.es.md"')
    expect(noscript).toContain(`href="mailto:${getProfile().email}"`)
  })

  it('keeps one startup indicator for every route', () => {
    for (const route of ROUTES) {
      const document = new DOMParser().parseFromString(buildRouteShell(INDEX_HTML, route), 'text/html')
      expect(document.querySelectorAll('#root'), route.id).toHaveLength(1)
      expect(document.querySelectorAll('#root .app-startup'), route.id).toHaveLength(1)
      expect(document.querySelector('#root progress')?.getAttribute('aria-label'), route.id).toBe('Loading portfolio')
    }
  })

  it('rejects missing or duplicate app roots', () => {
    const marker = '<div id="root">'
    expect(() => buildRouteShell(INDEX_HTML.replace(marker, ''), HOME_ROUTE)).toThrow(/agent-files/)
    expect(() => buildRouteShell(INDEX_HTML.replace(marker, `${marker}${marker}`), HOME_ROUTE)).toThrow(/agent-files/)
  })

  it('preloads the first project cover on /projects with the sources its <img> uses', () => {
    const cover = projectCoverSources(getAllProjects()[0])

    expect(cover.srcSet).toMatch(/ 800w, .+-full\.webp \d+w$/)
    expect(buildRouteShell(INDEX_HTML, routeOf('projects'))).toContain(
      `<link rel="preload" as="image" href="${cover.src}" imagesrcset="${cover.srcSet}" imagesizes="${cover.sizes}" fetchpriority="high">`,
    )
  })

  it('preloads the profile photo on /about with the src its <img> uses', () => {
    expect(buildRouteShell(INDEX_HTML, routeOf('about'))).toContain(
      `<link rel="preload" as="image" href="${getProfile().imageUrl}" fetchpriority="high">`,
    )
  })

  it('preloads no image on routes without an LCP image', () => {
    const withoutLcpImage = ROUTES.filter((candidate) => candidate.lcpImage === undefined)

    expect(withoutLcpImage.map((route) => route.id)).toEqual(['home', 'skills', 'experience', 'contact'])
    for (const route of withoutLcpImage) {
      expect(buildRouteShell(INDEX_HTML, route), route.id).not.toContain('as="image"')
    }
  })

  it('fails loudly when a marker is missing', () => {
    expect(() => buildRouteShell('<html><head></head><body><div id="root"></div></body></html>', HOME_ROUTE)).toThrow(
      /agent-files/,
    )
  })

  it('refuses a social image that is not a root-relative path', () => {
    const hardcoded = INDEX_HTML.replace(
      '<meta property="og:image" content="/',
      '<meta property="og:image" content="https://example.com/',
    )

    expect(() => buildRouteShell(hardcoded, HOME_ROUTE)).toThrow(/og:image must be a root-relative path/)
  })
})

describe('buildNotFoundPage', () => {
  const page = buildNotFoundPage(INDEX_HTML)

  it('keeps the address out of search results and claims no canonical page', () => {
    expect(page).toContain('<meta name="robots" content="noindex">')
    expect(page).not.toContain('rel="canonical"')
    expect(page).not.toContain('type="text/markdown"')
    expect(page).not.toContain('application/ld+json')
  })

  it('still runs the app, which sends the visitor home, and points no-JS visitors to the home twins', () => {
    expect(page).toContain('<div id="root">')
    expect(page).toContain(`<title>${HOME_ROUTE.shellTitle}</title>`)
    expect(noScriptContent(page)).toContain('href="/index.md"')
    expect(page).toContain('<progress aria-label="Loading portfolio"></progress>')
  })
})
