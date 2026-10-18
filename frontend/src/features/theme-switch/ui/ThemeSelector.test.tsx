import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
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

  it('shows the translated theme name and says what the button controls', async () => {
    await i18n.changeLanguage('es')
    renderSelector()

    const button = screen.getByRole('button', { name: 'Tema: Oscuro' })
    expect(button.textContent).toContain('Oscuro')
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
  })

  it('lists the three themes as radio items and applies the chosen one', () => {
    renderSelector()
    fireEvent.click(screen.getByRole('button', { name: 'Theme: Dark' }))

    const menu = screen.getByRole('menu', { name: 'Theme: Dark' })
    expect(
      within(menu)
        .getAllByRole('menuitemradio')
        .map((item) => item.getAttribute('aria-checked')),
    ).toEqual(['false', 'true', 'false'])

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Light' }))

    expect(screen.getByRole('button', { name: 'Theme: Light' })).toBeTruthy()
    expect(window.localStorage.getItem('themeMode')).toBe('light')
  })

  it('offers animation pause and resume separately from the three theme choices', () => {
    renderSelector()
    fireEvent.click(screen.getByRole('button', { name: 'Theme: Dark' }))

    const animations = screen.getByRole('menuitemcheckbox', { name: 'Animations' })
    expect(animations.getAttribute('aria-checked')).toBe('true')
    expect(animations.textContent).toContain(i18n.t('common.animations.enabled'))
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(3)

    fireEvent.click(animations)

    expect(window.localStorage.getItem('animationsPaused')).toBe('true')
    expect(screen.getByRole('button', { name: 'Theme: Dark' }).getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Theme: Dark' }))
    const paused = screen.getByRole('menuitemcheckbox', { name: 'Animations' })
    expect(paused.getAttribute('aria-checked')).toBe('false')
    expect(paused.textContent).toContain(i18n.t('common.animations.paused'))

    fireEvent.click(paused)

    expect(window.localStorage.getItem('animationsPaused')).toBe('false')
    expect(window.localStorage.getItem('themeMode')).toBeNull()
  })

  it.each(['true', 'false'])('prioritizes reduced motion without overwriting the saved pause %s', (saved) => {
    const system = fakeReducedMotion(true)
    window.localStorage.setItem('animationsPaused', saved)
    renderSelector()
    fireEvent.click(screen.getByRole('button', { name: 'Theme: Dark' }))

    const animations = screen.getByRole('menuitemcheckbox', { name: 'Animations' })
    expect(animations.getAttribute('aria-disabled')).toBe('true')
    expect(animations.getAttribute('aria-checked')).toBe('false')
    const explanation = document.getElementById(animations.getAttribute('aria-describedby') ?? '')
    expect(explanation?.textContent).toBe(i18n.t('common.animations.reducedSystem'))

    fireEvent.click(animations)
    expect(window.localStorage.getItem('animationsPaused')).toBe(saved)

    act(() => system.setReduced(false))

    expect(animations.getAttribute('aria-disabled')).not.toBe('true')
    expect(animations.getAttribute('aria-checked')).toBe(String(saved === 'false'))
    expect(window.localStorage.getItem('animationsPaused')).toBe(saved)
  })

  it('keeps the reduced-motion explanation reachable by keyboard without enabling animations', () => {
    fakeReducedMotion(true)
    window.localStorage.setItem('animationsPaused', 'false')
    renderSelector()
    fireEvent.click(screen.getByRole('button', { name: 'Theme: Dark' }))
    const glass = screen.getByRole('menuitemradio', { name: 'Liquid Glass' })
    const animations = screen.getByRole('menuitemcheckbox', { name: 'Animations' })

    act(() => glass.focus())
    fireEvent.keyDown(glass, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(animations)

    fireEvent.keyDown(animations, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(glass)
    fireEvent.keyDown(glass, { key: 'End' })
    expect(document.activeElement).toBe(animations)
    expect(animations.getAttribute('aria-disabled')).toBe('true')

    fireEvent.keyDown(animations, { key: 'Enter' })
    fireEvent.keyUp(animations, { key: 'Enter' })

    expect(animations.getAttribute('aria-checked')).toBe('false')
    expect(window.localStorage.getItem('animationsPaused')).toBe('false')
    expect(screen.getByRole('menu', { name: 'Theme: Dark' })).toBeTruthy()
  })
})
