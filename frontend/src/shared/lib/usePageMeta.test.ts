import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePageMeta } from './usePageMeta'

const getMeta = (name: string, attribute: 'name' | 'property' = 'name') =>
  document.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)

beforeEach(() => {
  document.head.innerHTML = ''
  document.title = 'Default title'
})

describe('usePageMeta', () => {
  it('applies the page title and description while mounted', () => {
    renderHook(() => usePageMeta({ title: 'About', description: 'About page' }))

    expect(document.title).toBe('About')
    expect(getMeta('description')?.getAttribute('content')).toBe('About page')
    expect(getMeta('og:title', 'property')?.getAttribute('content')).toBe('About')
    expect(getMeta('og:description', 'property')?.getAttribute('content')).toBe('About page')
  })

  it('restores the previous metadata on unmount', () => {
    document.head.innerHTML = '<meta name="description" content="Previous description" />'
    document.title = 'Previous title'

    const { unmount } = renderHook(() => usePageMeta({ title: 'Skills', description: 'Skills page' }))
    unmount()

    expect(document.title).toBe('Previous title')
    expect(getMeta('description')?.getAttribute('content')).toBe('Previous description')
  })

  it('removes metadata created by the hook when there was nothing to restore', () => {
    const { unmount } = renderHook(() => usePageMeta({ title: 'Contact', description: 'Contact page' }))
    unmount()

    expect(document.title).toBe('Default title')
    expect(getMeta('description')).toBeNull()
    expect(getMeta('og:title', 'property')).toBeNull()
    expect(getMeta('og:description', 'property')).toBeNull()
  })

  it('keeps the default description when the page does not provide one', () => {
    document.head.innerHTML = '<meta name="description" content="Default description" />'

    renderHook(() => usePageMeta({ title: 'Home' }))

    expect(getMeta('description')?.getAttribute('content')).toBe('Default description')
  })
})
