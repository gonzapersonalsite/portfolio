import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useLanguage, LanguageProvider } from '@/features/language-switch'
import { i18n } from '@/shared/config'

const renderLanguage = (initialEntry = '/') =>
  renderHook(
    () => ({
      ...useLanguage(),
      pathname: useLocation().pathname,
      search: useLocation().search,
    }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={[initialEntry]}>
          <LanguageProvider>{children}</LanguageProvider>
        </MemoryRouter>
      ),
    },
  )

describe('LanguageProvider', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with the language i18n resolved and sets the document language', () => {
    const { result } = renderLanguage()

    expect(result.current.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('does not save a language it only detected, so a later visit detects it again', () => {
    renderLanguage()

    expect(window.localStorage.getItem('language')).toBeNull()
  })

  it('applies, saves and reflects in the URL the language the visitor chooses', () => {
    const { result } = renderLanguage('/projects')

    act(() => result.current.setLanguage('es'))

    expect(result.current.language).toBe('es')
    expect(result.current.pathname).toBe('/es/projects')
    expect(i18n.language).toBe('es')
    expect(document.documentElement.lang).toBe('es')
    expect(window.localStorage.getItem('language')).toBe('es')

    act(() => result.current.setLanguage('en'))

    expect(result.current.language).toBe('en')
    expect(result.current.pathname).toBe('/projects')
    expect(window.localStorage.getItem('language')).toBe('en')
  })

  it('starts in Spanish when the visitor lands on a /es route', () => {
    const { result } = renderLanguage('/es/about')

    expect(result.current.language).toBe('es')
    expect(result.current.pathname).toBe('/es/about')
    expect(document.documentElement.lang).toBe('es')
  })

  it('saves the language of a ?lang= link, rewrites to the localized route and drops the parameter', () => {
    const { result } = renderLanguage('/about?lang=es&ref=cv')

    expect(window.localStorage.getItem('language')).toBe('es')
    expect(result.current.pathname).toBe('/es/about')
    expect(result.current.search).toBe('?ref=cv')
  })

  it('drops an unsupported ?lang= value without saving it', () => {
    const { result } = renderLanguage('/?lang=fr')

    expect(window.localStorage.getItem('language')).toBeNull()
    expect(result.current.search).toBe('')
  })

  it('keeps working when the browser blocks site data', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError')
    })
    const { result } = renderLanguage()

    act(() => result.current.setLanguage('es'))

    expect(result.current.language).toBe('es')
  })

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useLanguage())).toThrow('useLanguage must be used within a LanguageProvider')
    spy.mockRestore()
  })
})
