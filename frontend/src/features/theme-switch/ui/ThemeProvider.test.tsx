import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from '@/features/theme-switch'
import { THEME_BACKGROUNDS, type ColorMode } from '@/shared/config'

// The classic inline script of index.html that paints the theme before the app loads.
const indexHtml = readFileSync(resolve(import.meta.dirname, '../../../../index.html'), 'utf8')
const prePaintScript = indexHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''

const stubSystemScheme = (scheme: 'light' | 'dark') => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === `(prefers-color-scheme: ${scheme})`,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

const runPrePaintScript = () => {
  new Function(prePaintScript)()
}

const themeColor = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content')

const backgroundOf = (mode: ColorMode) => THEME_BACKGROUNDS[mode]

describe('index.html pre-paint theme', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.head.innerHTML = '<meta name="theme-color" content="#131416" />'
    document.documentElement.removeAttribute('style')
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('is found in index.html', () => {
    expect(prePaintScript).toContain('themeMode')
  })

  it.each(['light', 'dark'] as const)('paints the saved %s theme with its background', (mode) => {
    stubSystemScheme('dark')
    window.localStorage.setItem('themeMode', mode)

    runPrePaintScript()

    expect(themeColor()).toBe(backgroundOf(mode))
    expect(document.documentElement.dataset.theme).toBe(mode)
    expect(document.documentElement.style.backgroundColor).not.toBe('')
  })

  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('follows a %s system when nothing valid or legacy glass is saved', (scheme, mode) => {
    stubSystemScheme(scheme)
    window.localStorage.setItem('themeMode', 'glass')

    runPrePaintScript()

    expect(themeColor()).toBe(backgroundOf(mode))
    expect(document.documentElement.dataset.theme).toBe(mode)
    expect(window.localStorage.getItem('themeMode')).toBe('glass')
  })

  it('follows the system when site data is blocked', () => {
    stubSystemScheme('light')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    runPrePaintScript()

    expect(themeColor()).toBe(backgroundOf('light'))
  })

  it.each([
    ['glass', 'dark'],
    ['glass', 'light'],
    [null, 'light'],
    [null, 'dark'],
  ] as const)(
    'agrees with ThemeProvider (saved %s, %s system), which then hands styles back to tokens',
    (saved, scheme) => {
      stubSystemScheme(scheme)
      if (saved !== null) window.localStorage.setItem('themeMode', saved)

      runPrePaintScript()
      const painted = themeColor()
      render(<ThemeProvider>content</ThemeProvider>)

      expect(themeColor()).toBe(painted)
      expect(document.documentElement.getAttribute('style') ?? '').toBe('')
      expect(document.documentElement.dataset.theme).toBe(scheme)
      if (saved === 'glass') {
        expect(window.localStorage.getItem('themeMode')).toBe('glass')
      }
    },
  )
})
