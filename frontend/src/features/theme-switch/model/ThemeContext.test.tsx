import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { ThemeProvider, useColorMode } from '@/features/theme-switch'

// jsdom has no matchMedia: a controllable stand-in for '(prefers-color-scheme: light)'.
const fakeSystemScheme = (prefersLight: boolean) => {
  const listeners = new Set<() => void>()
  const query = {
    matches: prefersLight,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  )
  return {
    switchTo: (light: boolean) => {
      query.matches = light
      listeners.forEach((listener) => listener())
    },
  }
}

const renderColorMode = () =>
  renderHook(() => useColorMode(), {
    wrapper: ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>,
  })

const animationState = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--decorative-animation-state').trim()

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('follows the operating system on a first visit without saving anything', () => {
    fakeSystemScheme(true)
    const { result } = renderColorMode()

    expect(result.current.mode).toBe('light')
    expect(window.localStorage.getItem('themeMode')).toBeNull()
    expect(result.current.animationsPaused).toBe(false)
    expect(animationState()).toBe('running')
    expect(window.localStorage.getItem('animationsPaused')).toBeNull()
  })

  it.each([
    ['true', true, 'paused'],
    ['false', false, 'running'],
    ['invalid', false, 'running'],
  ] as const)('restores the saved animation preference %s', (saved, paused, state) => {
    fakeSystemScheme(false)
    window.localStorage.setItem('animationsPaused', saved)

    const { result } = renderColorMode()

    expect(result.current.animationsPaused).toBe(paused)
    expect(animationState()).toBe(state)
  })

  it('saves pause and resume independently of the chosen theme', () => {
    fakeSystemScheme(false)
    const { result } = renderColorMode()

    act(() => result.current.setAnimationsPaused(true))
    act(() => result.current.setColorMode('glass'))

    expect(result.current.animationsPaused).toBe(true)
    expect(animationState()).toBe('paused')
    expect(window.localStorage.getItem('animationsPaused')).toBe('true')

    act(() => result.current.setAnimationsPaused(false))

    expect(result.current.animationsPaused).toBe(false)
    expect(animationState()).toBe('running')
    expect(window.localStorage.getItem('animationsPaused')).toBe('false')
    expect(result.current.mode).toBe('glass')
  })

  it('keeps following the operating system when it switches while nothing is chosen', () => {
    const system = fakeSystemScheme(true)
    const { result } = renderColorMode()

    act(() => system.switchTo(false))

    expect(result.current.mode).toBe('dark')
  })

  it('saves an explicit choice and then ignores the operating system', () => {
    const system = fakeSystemScheme(false)
    const { result } = renderColorMode()

    act(() => result.current.setColorMode('glass'))
    act(() => system.switchTo(true))

    expect(result.current.mode).toBe('glass')
    expect(window.localStorage.getItem('themeMode')).toBe('glass')
  })

  it('restores a saved choice and ignores an invalid one', () => {
    fakeSystemScheme(true)
    window.localStorage.setItem('themeMode', 'dark')
    expect(renderColorMode().result.current.mode).toBe('dark')

    window.localStorage.setItem('themeMode', 'sepia')
    expect(renderColorMode().result.current.mode).toBe('light')
  })

  it('updates the browser theme colour with the theme', () => {
    fakeSystemScheme(false)
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
    const { result } = renderColorMode()

    act(() => result.current.setColorMode('light'))

    expect(meta.getAttribute('content')).toBe('#f5f5f5')
    meta.remove()
  })

  it('keeps working when the browser blocks site data', () => {
    fakeSystemScheme(false)
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError')
    })
    const { result } = renderColorMode()

    act(() => result.current.setColorMode('light'))
    act(() => result.current.setAnimationsPaused(true))

    expect(result.current.mode).toBe('light')
    expect(result.current.animationsPaused).toBe(true)
    expect(animationState()).toBe('paused')
  })

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useColorMode())).toThrow('useColorMode must be used within a ThemeProvider')
    spy.mockRestore()
  })
})
