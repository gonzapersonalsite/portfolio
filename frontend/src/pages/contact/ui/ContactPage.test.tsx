import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ContactPage from '@/pages/contact'
import { LanguageProvider } from '@/features/language-switch'
import { NotificationProvider } from '@/features/notifications'
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

const renderContactPage = () => {
  const view = render(
    <MemoryRouter>
      <LanguageProvider>
        <ThemeProvider>
          <NotificationProvider>
            <ContactPage />
          </NotificationProvider>
        </ThemeProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
  const goblin = view.container.querySelector<SVGSVGElement>('svg[role="img"]')
  if (!goblin) throw new Error('contact goblin svg not rendered')
  return { ...view, goblin }
}

describe('ContactPage pixel goblin', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('es')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('mounts the shared PixelGoblin with entry and exit portals on top of the contact form panel', () => {
    fakeMediaQueries({ prefersLight: false, reducedMotion: false })
    const { goblin } = renderContactPage()

    expect(goblin.getAttribute('viewBox')).toBe('0 0 384 60')
    expect(goblin.querySelector('g[data-motion]')?.getAttribute('data-motion')).toBe('animated')
    expect(goblin.querySelector('g[data-portal="entry"]')?.getAttribute('transform')).toBe('translate(18 27)')
    expect(goblin.querySelector('g[data-portal="exit"]')?.getAttribute('transform')).toBe('translate(366 27)')
    expect(goblin.querySelectorAll('g[data-portal-layer]')).toHaveLength(6)
    expect(goblin.querySelectorAll('g[data-portal-particle]')).toHaveLength(16)

    const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
    const panelWrapper = goblin.parentElement?.parentElement
    expect(panelWrapper?.contains(submitButton)).toBe(true)
  })

  it('switches the contact panel goblin to its resting pose when animations are paused', () => {
    fakeMediaQueries({ prefersLight: false, reducedMotion: false })
    window.localStorage.setItem('animationsPaused', 'true')
    const { goblin } = renderContactPage()

    expect(goblin.querySelector('g[data-motion]')?.getAttribute('data-motion')).toBe('resting')
    expect(goblin.querySelectorAll('g[data-portal]')).toHaveLength(0)
    expect(goblin.querySelectorAll('animate, animateTransform')).toHaveLength(0)
  })
})
