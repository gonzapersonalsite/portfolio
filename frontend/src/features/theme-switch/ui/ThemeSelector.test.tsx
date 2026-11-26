import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider, ThemeSelector } from '@/features/theme-switch'
import { i18n } from '@/shared/config'

const renderSelector = () =>
  render(
    <ThemeProvider>
      <ThemeSelector />
    </ThemeProvider>,
  )

const fakeReducedMotion = (reduced: boolean) => {
  const listeners = new Set<() => void>()
  const motionQuery = {
    matches: reduced,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) =>
      query === '(prefers-reduced-motion: reduce)'
        ? motionQuery
        : {
            matches: false,
            addEventListener: () => {},
            removeEventListener: () => {},
          },
    ),
  )
  return {
    setReduced: (next: boolean) => {
      motionQuery.matches = next
      listeners.forEach((listener) => listener())
    },
  }
}

describe('ThemeSelector', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    fakeReducedMotion(false)
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders direct theme and animation toggle buttons without custom menu roles', async () => {
    await i18n.changeLanguage('es')
    renderSelector()

    const themeButton = screen.getByRole('button', { name: 'Tema: Oscuro. Cambiar a Claro' })
    expect(themeButton.textContent).toContain('Oscuro')
    expect(themeButton.hasAttribute('aria-haspopup')).toBe(false)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('toggles directly between Light and Dark themes on click and persists the choice', () => {
    renderSelector()

    const button = screen.getByRole('button', { name: 'Theme: Dark. Switch to Light' })
    fireEvent.click(button)

    expect(screen.getByRole('button', { name: 'Theme: Light. Switch to Dark' })).toBeTruthy()
    expect(window.localStorage.getItem('themeMode')).toBe('light')

    fireEvent.click(screen.getByRole('button', { name: 'Theme: Light. Switch to Dark' }))
    expect(window.localStorage.getItem('themeMode')).toBe('dark')
  })

  it('names the animations button after the action it performs, without writing themeMode', () => {
    renderSelector()

    const animations = screen.getByRole('button', { name: 'Pause animations' })
    expect(animations.hasAttribute('aria-pressed')).toBe(false)

    fireEvent.click(animations)

    expect(animations.getAttribute('aria-label')).toBe('Play animations')
    expect(window.localStorage.getItem('animationsPaused')).toBe('true')
    expect(window.localStorage.getItem('themeMode')).toBeNull()

    fireEvent.click(animations)

    expect(animations.getAttribute('aria-label')).toBe('Pause animations')
    expect(window.localStorage.getItem('animationsPaused')).toBe('false')
  })

  it.each([
    ['en', false, 'false'],
    ['en', false, 'true'],
    ['en', true, 'false'],
    ['es', false, 'false'],
    ['es', false, 'true'],
    ['es', true, 'false'],
  ] as const)(
    'keeps the visible word inside the accessible name (%s, reduced motion %s, paused %s)',
    async (language, reduced, saved) => {
      await i18n.changeLanguage(language)
      fakeReducedMotion(reduced)
      window.localStorage.setItem('animationsPaused', saved)
      renderSelector()

      const animations = screen.getAllByRole('button')[1]
      const visible = animations.textContent?.trim().toLowerCase() ?? ''
      expect(visible.length).toBeGreaterThan(0)
      expect(animations.getAttribute('aria-label')?.toLowerCase()).toContain(visible)
    },
  )

  it.each(['true', 'false'])('prioritizes reduced motion without overwriting saved pause %s', (saved) => {
    const system = fakeReducedMotion(true)
    window.localStorage.setItem('animationsPaused', saved)
    renderSelector()

    const animations = screen.getByRole('button', { name: 'Animations paused' })
    expect(animations.getAttribute('aria-disabled')).toBe('true')
    expect(document.getElementById(animations.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      i18n.t('common.animations.reducedSystem'),
    )

    fireEvent.click(animations)
    expect(window.localStorage.getItem('animationsPaused')).toBe(saved)

    act(() => system.setReduced(false))

    expect(animations.hasAttribute('aria-disabled')).toBe(false)
    expect(animations.hasAttribute('aria-describedby')).toBe(false)
    expect(animations.getAttribute('aria-label')).toBe(saved === 'true' ? 'Play animations' : 'Pause animations')
    expect(window.localStorage.getItem('animationsPaused')).toBe(saved)
  })

  it('keeps the reduced-motion animations toggle keyboard focusable and at full opacity', () => {
    fakeReducedMotion(true)
    renderSelector()

    const animations = screen.getByRole('button', { name: 'Animations paused' })
    expect(animations.hasAttribute('disabled')).toBe(false)
    expect(animations.getAttribute('aria-disabled')).toBe('true')
    expect(getComputedStyle(animations).opacity).toBe('1')

    act(() => animations.focus())
    expect(document.activeElement).toBe(animations)
  })
})
