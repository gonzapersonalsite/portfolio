import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface HeaderRule {
  source: string
  headers: { key: string; value: string }[]
}

interface VercelConfig {
  rewrites?: unknown[]
  headers: HeaderRule[]
}

const frontendFile = (name: string): string => readFileSync(resolve(import.meta.dirname, '../..', name), 'utf8')

const config = JSON.parse(frontendFile('vercel.json')) as VercelConfig
const indexHtml = frontendFile('index.html')

const headerOf = (source: string, key: string): string | undefined =>
  config.headers.find((rule) => rule.source === source)?.headers.find((header) => header.key === key)?.value

// Browsers hash the text of an inline script after normalising line breaks to LF.
const cspHashOf = (script: string): string =>
  `'sha256-${createHash('sha256').update(script.replace(/\r\n?/g, '\n'), 'utf8').digest('base64')}'`

// Classic inline scripts run and need a CSP hash; JSON-LD blocks are data and never run.
const inlineScripts = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1])

// Files of public/ that index.html names by root-relative path.
const iconLinks = [...indexHtml.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g)].map(
  (match) => match[1],
)
const socialImages = [
  ...indexHtml.matchAll(/<meta (?:property="og:image"|name="twitter:image") content="([^"]+)"/g),
].map((match) => match[1])

describe('vercel.json', () => {
  const policy = headerOf('/(.*)', 'Content-Security-Policy') ?? ''
  const directive = (name: string): string[] =>
    policy
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .find(([directiveName]) => directiveName === name)
      ?.slice(1) ?? []

  it('sends a Content-Security-Policy on every response', () => {
    expect(directive('default-src')).toEqual(["'self'"])
    expect(directive('object-src')).toEqual(["'none'"])
    expect(directive('frame-ancestors')).toEqual(["'none'"])
  })

  it('allows every inline script of index.html by its hash, and nothing else inline', () => {
    expect(inlineScripts.length).toBeGreaterThan(0)
    expect(directive('script-src')).toEqual(["'self'", ...inlineScripts.map(cspHashOf)])
  })

  it('lets the contact form reach EmailJS only', () => {
    expect(directive('connect-src')).toEqual(["'self'", 'https://api.emailjs.com'])
  })

  // Each route has its own shell and every other address gets 404.html with status 404; a
  // catch-all rewrite would answer missing assets and images with the home page (status 200).
  it('has no rewrites', () => {
    expect(config.rewrites).toBeUndefined()
  })

  it('keeps the markdown twins out of search results', () => {
    expect(headerOf('/(.*)\\.md', 'X-Robots-Tag')).toBe('noindex')
  })

  // A year-long immutable cache is safe only because a new icon gets new file names.
  it('serves the icons from /icons/, cached immutable', () => {
    expect(iconLinks.length).toBeGreaterThan(0)
    for (const href of iconLinks) expect(href, href).toMatch(/^\/icons\/[\w.-]+$/)
    expect(headerOf('/icons/(.*)', 'Cache-Control')).toContain('immutable')
  })
})

describe('index.html', () => {
  it('links only icons and social images that public/ ships', () => {
    expect(socialImages).toHaveLength(2)
    for (const path of [...iconLinks, ...socialImages]) {
      expect(existsSync(resolve(import.meta.dirname, '../../public', `.${path}`)), path).toBe(true)
    }
  })
})
