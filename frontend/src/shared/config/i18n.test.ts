import { describe, expect, it } from 'vitest'
import i18n from './i18n'

const LOCALES = ['en', 'es'] as const

// Static keys only: template-literal keys (skills.categories.*, projects.types.*)
// are covered by the twin label parity tests.
const KEY_PATTERN = /\bt\(\s*['"`]([\w.]+)['"`]/g

const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const flattenKeys = (node: unknown, prefix = ''): string[] =>
  Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flattenKeys(value, `${prefix}${key}.`),
  )

describe('i18n resources', () => {
  it('define the same keys in English and Spanish', () => {
    const [english, spanish] = LOCALES.map((locale) =>
      flattenKeys(i18n.getResourceBundle(locale, 'translation')).sort(),
    )
    expect(spanish).toEqual(english)
  })

  it('define every static key the code translates, so no call needs an inline default', () => {
    const usedKeys = new Set(
      Object.values(sources).flatMap((source) => [...source.matchAll(KEY_PATTERN)].map((match) => match[1])),
    )

    expect(usedKeys.size).toBeGreaterThan(0)
    for (const key of usedKeys) {
      for (const locale of LOCALES) {
        expect(i18n.exists(key, { lng: locale }), `${locale}: ${key}`).toBe(true)
      }
    }
  })
})
