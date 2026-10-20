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
  it('prefers a ?lang= link, then a /en path, then the saved choice, then the browser', () => {
    expect(resolveInitialLanguage({ path: null, query: 'es', stored: 'en', browser: 'en-US' })).toBe('es')
    expect(resolveInitialLanguage({ path: 'en', query: 'es', stored: 'en', browser: 'en-US' })).toBe('es')
    expect(resolveInitialLanguage({ path: 'en', query: null, stored: 'es', browser: 'es-ES' })).toBe('en')
    expect(resolveInitialLanguage({ path: null, query: null, stored: 'en', browser: 'es-ES' })).toBe('en')
    expect(resolveInitialLanguage({ path: null, query: null, stored: null, browser: 'en-US' })).toBe('en')
  })

  it('skips values it cannot use and falls back to Spanish', () => {
    expect(resolveInitialLanguage({ path: 'fr', query: 'fr', stored: 'de', browser: 'en-GB' })).toBe('en')
    expect(resolveInitialLanguage({ path: null, query: null, stored: 'fr', browser: 'pt-BR' })).toBe('es')
  })
})
