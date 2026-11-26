import { describe, expect, it } from 'vitest'
import { COLOR_MODES, THEME_BACKGROUNDS, resolveStoredColorMode } from './theme'

describe('theme config', () => {
  it('supports only light and dark color modes', () => {
    expect(COLOR_MODES).toEqual(['light', 'dark'])
    expect(THEME_BACKGROUNDS).toEqual({
      light: '#f4f1ea',
      dark: '#131416',
    })
  })

  it('restores explicit light or dark choices and ignores legacy or unknown values passively', () => {
    expect(resolveStoredColorMode('light')).toBe('light')
    expect(resolveStoredColorMode('dark')).toBe('dark')
    expect(resolveStoredColorMode('glass')).toBeNull()
    expect(resolveStoredColorMode('sepia')).toBeNull()
    expect(resolveStoredColorMode(null)).toBeNull()
  })
})
