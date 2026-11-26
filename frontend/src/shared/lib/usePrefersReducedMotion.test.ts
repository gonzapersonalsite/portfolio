import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

const fakeReducedMotionQuery = (initiallyReduced: boolean) => {
  const listeners = new Set<() => void>()
  const query = {
    matches: initiallyReduced,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) =>
      media === '(prefers-reduced-motion: reduce)'
        ? query
        : { matches: false, addEventListener: () => {}, removeEventListener: () => {} },
    ),
  )
  return {
    listenerCount: () => listeners.size,
    setReduced: (next: boolean) => {
      query.matches = next
      listeners.forEach((listener) => listener())
    },
  }
}

describe('usePrefersReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([true, false])('starts from the current system preference (%s)', (reduced) => {
    fakeReducedMotionQuery(reduced)

    const { result } = renderHook(() => usePrefersReducedMotion())

    expect(result.current).toBe(reduced)
  })

  it('follows the system preference when it changes and stops listening on unmount', () => {
    const system = fakeReducedMotionQuery(false)
    const { result, unmount } = renderHook(() => usePrefersReducedMotion())

    act(() => system.setReduced(true))
    expect(result.current).toBe(true)

    act(() => system.setReduced(false))
    expect(result.current).toBe(false)

    unmount()
    expect(system.listenerCount()).toBe(0)
  })

  it('reports no reduced motion where the browser has no matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined)

    const { result } = renderHook(() => usePrefersReducedMotion())

    expect(result.current).toBe(false)
  })
})
