import { createContext, useContext } from 'react'
import type { ColorMode } from '@/shared/config'

export interface ColorModeContextType {
  mode: ColorMode
  // The visitor's explicit choice: it is applied and saved for later visits.
  setColorMode: (mode: ColorMode) => void
  // The visitor's preference; the system's reduced-motion setting always takes priority.
  animationsPaused: boolean
  setAnimationsPaused: (paused: boolean) => void
}

export const ColorModeContext = createContext<ColorModeContextType | undefined>(undefined)

export const useColorMode = () => {
  const context = useContext(ColorModeContext)
  if (context === undefined) {
    throw new Error('useColorMode must be used within a ThemeProvider')
  }
  return context
}
