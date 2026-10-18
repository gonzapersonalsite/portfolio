import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_QUERY_PARAM,
  LANGUAGE_STORAGE_KEY,
  toSupportedLanguage,
  type Language,
} from '@/shared/config'
import { writeStorage } from '@/shared/lib'
import { LanguageContext } from '../model/LanguageContext'

// i18n (shared/config) resolves the initial language once, before the first render; this
// provider owns every later change. Only explicit choices are saved: a language detected from
// the browser is detected again on the next visit, so it follows the browser if that changes.
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [language, setLanguageState] = useState<Language>(
    () => toSupportedLanguage(i18n.resolvedLanguage) ?? DEFAULT_LANGUAGE,
  )

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    writeStorage(LANGUAGE_STORAGE_KEY, next)
  }, [])

  // A shared ?lang= link counts as a choice. Once saved, the parameter is dropped so a later
  // switch in the menu is not undone by reloading the same address.
  useEffect(() => {
    if (!searchParams.has(LANGUAGE_QUERY_PARAM)) return

    const requested = toSupportedLanguage(searchParams.get(LANGUAGE_QUERY_PARAM))
    if (requested !== null) {
      writeStorage(LANGUAGE_STORAGE_KEY, requested)
    }
    setSearchParams(
      (params) => {
        params.delete(LANGUAGE_QUERY_PARAM)
        return params
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  useEffect(() => {
    void i18n.changeLanguage(language)
    document.documentElement.lang = language
  }, [language, i18n])

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
