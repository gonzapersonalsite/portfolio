export const COLOR_MODES = ['light', 'dark'] as const

export type ColorMode = (typeof COLOR_MODES)[number]

export const THEME_BACKGROUNDS: Record<ColorMode, string> = {
  light: '#f4f1ea',
  dark: '#131416',
}

// Legacy stored choices such as 'glass' are ignored passively without modifying localStorage,
// allowing the OS scheme preference to apply while keeping old storage intact.
export const resolveStoredColorMode = (saved: string | null): ColorMode | null =>
  COLOR_MODES.find((mode) => mode === saved) ?? null
