import { createContext, useContext } from 'react'
import type { Language } from '@/shared/config'

export interface LanguageContextType {
  language: Language
  // The visitor's explicit choice: it is applied and saved for later visits.
  setLanguage: (language: Language) => void
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
