import { describe, expect, it } from 'vitest'
import { resolveInitialLanguage, toSupportedLanguage } from './language'

describe('toSupportedLanguage', () => {
  it('accepts the UI languages, regional tags included', () => {
    expect(toSupportedLanguage('es')).toBe('es')
    expect(toSupportedLanguage('es-ES')).toBe('es')
    expect(toSupportedLanguage('EN-gb')).toBe('en')
  })

  it('rejects languages the UI is not translated into', () => {
    expect(toSupportedLanguage('fr')).toBeNull()
    expect(toSupportedLanguage('')).toBeNull()
    expect(toSupportedLanguage(null)).toBeNull()
  })
})

describe('resolveInitialLanguage', () => {
  it('prefers a ?lang= link, then a /es path, then the saved choice, then the browser', () => {
    expect(resolveInitialLanguage({ path: null, query: 'es', stored: 'en', browser: 'en-US' })).toBe('es')
    expect(resolveInitialLanguage({ path: 'es', query: 'en', stored: 'es', browser: 'es-ES' })).toBe('en')
    expect(resolveInitialLanguage({ path: 'es', query: null, stored: 'en', browser: 'en-US' })).toBe('es')
    expect(resolveInitialLanguage({ path: null, query: null, stored: 'es', browser: 'en-US' })).toBe('es')
    expect(resolveInitialLanguage({ path: null, query: null, stored: null, browser: 'es-ES' })).toBe('es')
  })

  it('skips values it cannot use and falls back to English', () => {
    expect(resolveInitialLanguage({ path: 'fr', query: 'fr', stored: 'de', browser: 'es-MX' })).toBe('es')
    expect(resolveInitialLanguage({ path: null, query: null, stored: 'fr', browser: 'pt-BR' })).toBe('en')
  })
})
