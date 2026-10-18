import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '@/pages/home'
import { LanguageProvider } from '@/features/language-switch'
import { ThemeProvider } from '@/features/theme-switch'
import { i18n } from '@/shared/config'

const fakeMediaQueries = (options: { prefersLight?: boolean; reducedMotion?: boolean } = {}) => {
  const { prefersLight = false, reducedMotion = false } = options
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        query === '(prefers-color-scheme: light)'
          ? prefersLight
          : query === '(prefers-reduced-motion: reduce)'
            ? reducedMotion
            : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

const renderHomePage = () => {
  const view = render(
    <MemoryRouter>
      <LanguageProvider>
        <ThemeProvider>
          <HomePage />
        </ThemeProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
  const goblin = view.container.querySelector<SVGSVGElement>('svg[role="img"]')
  if (!goblin) throw new Error('hero goblin svg not rendered')
  return { ...view, goblin }
}

describe('HomePage hero goblin', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('es')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('mounts the animated goblin and its 2D pixel portals inside the floating hero panel container', () => {
    fakeMediaQueries({ prefersLight: false, reducedMotion: false })
    const { goblin } = renderHomePage()

    expect(goblin.getAttribute('aria-label')).toBe(
      'Un duende pixelado saca un portátil de detrás de la espalda, programa un rato, mira a los lados y sale corriendo',
    )
    expect(goblin.getAttribute('viewBox')).toBe('0 0 384 60')

    const stageGroup = goblin.querySelector('g[data-motion]')
    expect(stageGroup?.getAttribute('data-motion')).toBe('animated')
    expect(stageGroup?.getAttribute('transform')).toBe('translate(-135 15)')
    expect(goblin.querySelectorAll('animate, animateTransform').length).toBeGreaterThan(0)

    const clipRect = goblin.querySelector('clipPath rect')
    expect(clipRect?.getAttribute('x')).toBe('18')
    expect(clipRect?.getAttribute('width')).toBe('348')

    const entryPortal = goblin.querySelector('g[data-portal="entry"]')
    const exitPortal = goblin.querySelector('g[data-portal="exit"]')
    expect(entryPortal?.getAttribute('transform')).toBe('translate(18 27)')
    expect(exitPortal?.getAttribute('transform')).toBe('translate(366 27)')
    expect(
      Array.from(entryPortal?.querySelectorAll('g[data-portal-layer]') ?? []).map((layer) =>
        layer.getAttribute('data-portal-layer'),
      ),
    ).toEqual(['outer', 'rim', 'core'])
    expect(
      entryPortal?.querySelectorAll('g[data-portal-layer="core"] animateTransform[type="translate"]'),
    ).toHaveLength(0)
    expect(goblin.querySelectorAll('g[data-portal-particle="entry"]')).toHaveLength(8)
    expect(goblin.querySelectorAll('g[data-portal-particle="exit"]')).toHaveLength(8)

    const frontendChip = screen.getByText('Desarrollador Frontend')
    const floatingWrapper = goblin.parentElement?.parentElement
    expect(floatingWrapper?.contains(frontendChip)).toBe(true)
  })

  it('switches the goblin to its central resting coding pose with closed portals when animations are paused', () => {
    fakeMediaQueries({ prefersLight: false, reducedMotion: false })
    window.localStorage.setItem('animationsPaused', 'true')
    const { goblin } = renderHomePage()

    const stageGroup = goblin.querySelector('g[data-motion]')
    expect(stageGroup?.getAttribute('data-motion')).toBe('resting')
    expect(stageGroup?.getAttribute('transform')).toBe('translate(147 15)')
    expect(goblin.querySelectorAll('animate, animateTransform')).toHaveLength(0)
    expect(goblin.querySelectorAll('g[data-portal]')).toHaveLength(0)

    const shadow = goblin.querySelector('ellipse')
    expect(shadow?.getAttribute('cx')).toBe('48')
    expect(shadow?.getAttribute('rx')).toBe('51')
  })

  it('switches the goblin to its central resting coding pose when the system requests reduced motion', () => {
    fakeMediaQueries({ prefersLight: true, reducedMotion: true })
    const { goblin } = renderHomePage()

    const stageGroup = goblin.querySelector('g[data-motion]')
    expect(stageGroup?.getAttribute('data-motion')).toBe('resting')
    expect(stageGroup?.getAttribute('transform')).toBe('translate(147 15)')
    expect(goblin.querySelectorAll('animate, animateTransform')).toHaveLength(0)
    expect(goblin.querySelectorAll('g[data-portal]')).toHaveLength(0)
  })

  it.each([
    ['light', '#9a6b2f', '0.18'],
    ['dark', '#d4a373', '0.55'],
    ['glass', '#d4a373', '0.55'],
  ] as const)('applies the %s theme palette to the goblin SVG', (themeMode, glyphFill, shadowOpacity) => {
    fakeMediaQueries({ prefersLight: themeMode === 'light', reducedMotion: true })
    window.localStorage.setItem('themeMode', themeMode)
    const { goblin } = renderHomePage()

    const shadow = goblin.querySelector('ellipse')
    const glyphs = Array.from(goblin.querySelectorAll('text'))

    expect(shadow?.getAttribute('opacity')).toBe(shadowOpacity)
    expect(glyphs.map((glyph) => glyph.textContent)).toEqual(['{}', '</>', ';'])
    expect(glyphs[0]?.getAttribute('fill')).toBe(glyphFill)
  })

  it('pauses the SVG SMIL clock when the goblin scrolls out of the viewport and resumes it when visible', () => {
    fakeMediaQueries({ prefersLight: false, reducedMotion: false })
    const callbacks: Array<(entries: IntersectionObserverEntry[]) => void> = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
          callbacks.push(cb)
        }
        observe = vi.fn()
        disconnect = vi.fn()
      },
    )

    const pauseSpy = vi.fn()
    const unpauseSpy = vi.fn()
    Object.defineProperty(SVGElement.prototype, 'pauseAnimations', {
      configurable: true,
      value: pauseSpy,
    })
    Object.defineProperty(SVGElement.prototype, 'unpauseAnimations', {
      configurable: true,
      value: unpauseSpy,
    })

    renderHomePage()
    expect(unpauseSpy).toHaveBeenCalledTimes(1)

    callbacks[0]?.([{ isIntersecting: false } as IntersectionObserverEntry])
    expect(pauseSpy).toHaveBeenCalledTimes(1)

    callbacks[0]?.([{ isIntersecting: true } as IntersectionObserverEntry])
    expect(unpauseSpy).toHaveBeenCalledTimes(2)
  })
})
