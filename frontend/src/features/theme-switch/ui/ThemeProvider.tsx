import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline, GlobalStyles } from '@mui/material'
import { COLOR_MODES, createAppTheme, type ColorMode } from '@/shared/config'
import { readStorage, writeStorage } from '@/shared/lib'
import { ColorModeContext } from '../model/ThemeContext'

const THEME_STORAGE_KEY = 'themeMode'
const ANIMATIONS_STORAGE_KEY = 'animationsPaused'
const LIGHT_SCHEME_QUERY = '(prefers-color-scheme: light)'

const readSavedMode = (): ColorMode | null => {
  const saved = readStorage(THEME_STORAGE_KEY)
  return COLOR_MODES.find((mode) => mode === saved) ?? null
}

const lightSchemeQuery = (): MediaQueryList | null =>
  typeof window.matchMedia === 'function' ? window.matchMedia(LIGHT_SCHEME_QUERY) : null

// Dark unless the system explicitly asks for light.
const systemModeOf = (query: MediaQueryList | null): ColorMode => (query?.matches ? 'light' : 'dark')

// Until the visitor picks a theme, the site follows the operating system, including when it
// switches between light and dark on a schedule. Only an explicit choice is saved.
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedMode, setSavedMode] = useState<ColorMode | null>(readSavedMode)
  const [systemMode, setSystemMode] = useState<ColorMode>(() => systemModeOf(lightSchemeQuery()))
  const [animationsPaused, setPaused] = useState(() => readStorage(ANIMATIONS_STORAGE_KEY) === 'true')
  const mode = savedMode ?? systemMode

  useEffect(() => {
    const query = lightSchemeQuery()
    if (query === null) return

    const followSystem = () => setSystemMode(systemModeOf(query))
    query.addEventListener('change', followSystem)
    return () => query.removeEventListener('change', followSystem)
  }, [])

  const setColorMode = useCallback((next: ColorMode) => {
    setSavedMode(next)
    writeStorage(THEME_STORAGE_KEY, next)
  }, [])

  const setAnimationsPaused = useCallback((paused: boolean) => {
    setPaused(paused)
    writeStorage(ANIMATIONS_STORAGE_KEY, String(paused))
  }, [])

  const colorMode = useMemo(
    () => ({ mode, setColorMode, animationsPaused, setAnimationsPaused }),
    [mode, setColorMode, animationsPaused, setAnimationsPaused],
  )

  const theme = useMemo(() => createAppTheme(mode), [mode])

  // index.html paints the page background and colour scheme on <html> before the app loads.
  // From the first render on, CssBaseline owns them and follows every theme change.
  useEffect(() => {
    const root = document.documentElement.style
    root.removeProperty('background-color')
    root.removeProperty('color-scheme')
  }, [])

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.palette.background.default)
  }, [theme])

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        {/* enableColorScheme makes scrollbars and native form controls follow the theme. */}
        <CssBaseline enableColorScheme />
        {/* Shared UI consumes CSS, so it never has to import this feature's context. */}
        <GlobalStyles
          styles={{
            ':root': { '--decorative-animation-state': animationsPaused ? 'paused' : 'running' },
            '@media (prefers-reduced-motion: reduce)': {
              ':root': { '--decorative-animation-state': 'paused' },
            },
          }}
        />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  )
}
