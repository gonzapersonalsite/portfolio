import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { THEME_BACKGROUNDS, resolveStoredColorMode, type ColorMode } from '@/shared/config'
import { readStorage, writeStorage } from '@/shared/lib'
import { ColorModeContext } from '../model/ThemeContext'
import './ThemeProvider.css'

const THEME_STORAGE_KEY = 'themeMode'
const ANIMATIONS_STORAGE_KEY = 'animationsPaused'
const LIGHT_SCHEME_QUERY = '(prefers-color-scheme: light)'

const readSavedMode = (): ColorMode | null => resolveStoredColorMode(readStorage(THEME_STORAGE_KEY))

const lightSchemeQuery = (): MediaQueryList | null =>
  typeof window.matchMedia === 'function' ? window.matchMedia(LIGHT_SCHEME_QUERY) : null

// Dark unless the system explicitly asks for light.
const systemModeOf = (query: MediaQueryList | null): ColorMode => (query?.matches ? 'light' : 'dark')

// Until the visitor picks a theme, the site follows the operating system, including when it
// switches between light and dark on a schedule. Only an explicit choice is saved, leaving
// any legacy stored value (such as 'glass') untouched while falling back passively to the OS.
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

  // index.html paints the pre-load background and color-scheme inline on <html> to prevent flashes.
  // Once mounted, tokens.css drives theme colors via [data-theme] so inline style stays clean.
  useEffect(() => {
    const root = document.documentElement.style
    root.removeProperty('background-color')
    root.removeProperty('color-scheme')
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BACKGROUNDS[mode])
  }, [mode])

  useEffect(() => {
    document.documentElement.dataset.animations = animationsPaused ? 'paused' : 'running'
  }, [animationsPaused])

  return <ColorModeContext.Provider value={colorMode}>{children}</ColorModeContext.Provider>
}
