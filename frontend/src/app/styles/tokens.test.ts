import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { THEME_BACKGROUNDS } from '@/shared/config'

const stylesheet = readFileSync(resolve(import.meta.dirname, 'tokens.css'), 'utf8')

// The custom properties a rule declares, by the selector that opens it.
const tokensOf = (selector: string): Record<string, string> => {
  const start = stylesheet.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`tokens.css has no rule for ${selector}`)
  const body = stylesheet.slice(start, stylesheet.indexOf('}', start))
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  )
}

const light = tokensOf("html[data-theme='light']")
const darkByChoice = tokensOf("html[data-theme='dark']")
const darkBySystem = tokensOf(":root:not([data-theme='light'])")

// What a theme does not change: the type stacks and whether decorative motion runs.
const isThemed = (token: string): boolean => !token.startsWith('--font-') && token !== '--decorative-animation-state'

describe('design tokens', () => {
  it('gives the dark theme the same values whether the visitor chose it or the system asks for it', () => {
    expect(darkBySystem).toEqual(darkByChoice)
  })

  it('defines in the dark theme every token the light theme themes, and no other', () => {
    expect(Object.keys(darkByChoice).sort()).toEqual(Object.keys(light).filter(isThemed).sort())
  })

  it('paints the page with the background the theme configuration announces before the styles load', () => {
    expect({ light: light['--bg'], dark: darkByChoice['--bg'] }).toEqual(THEME_BACKGROUNDS)
  })
})
