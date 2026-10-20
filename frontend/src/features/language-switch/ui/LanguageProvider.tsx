import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  DEFAULT_LANGUAGE,
  findAppRoute,
  LANGUAGE_QUERY_PARAM,
  LANGUAGE_STORAGE_KEY,
  localizedPath,
  pathnameLanguage,
  toSupportedLanguage,
  type Language,
} from '@/shared/config'
import { writeStorage } from '@/shared/lib'
import { LanguageContext } from '../model/LanguageContext'

// i18n (shared/config) resolves the initial language once, before the first render; this
// provider owns every later change and keeps the URL path (root vs /en) aligned with the
// active language so the address bar is always shareable in the language shown on screen.
// Only explicit choices (`setLanguage` or `?lang=`) are saved in storage.
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation()
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    () => toSupportedLanguage(i18n.resolvedLanguage) ?? DEFAULT_LANGUAGE,
  )

  const queryLanguage = toSupportedLanguage(new URLSearchParams(search).get(LANGUAGE_QUERY_PARAM))
  const language: Language = queryLanguage ?? pathnameLanguage(pathname) ?? selectedLanguage

  const setLanguage = useCallback(
    (next: Language) => {
      setSelectedLanguage(next)
      writeStorage(LANGUAGE_STORAGE_KEY, next)
      const route = findAppRoute(pathname)
      if (route !== undefined) {
        const nextPathname = localizedPath(route.path, next)
        if (nextPathname !== pathname) {
          navigate(`${nextPathname}${search}${hash}`, { replace: true })
        }
      }
    },
    [pathname, search, hash, navigate],
  )

  useEffect(() => {
    const params = new URLSearchParams(search)
    const hasQueryLang = params.has(LANGUAGE_QUERY_PARAM)
    const requested = hasQueryLang ? toSupportedLanguage(params.get(LANGUAGE_QUERY_PARAM)) : null
    if (requested !== null) {
      writeStorage(LANGUAGE_STORAGE_KEY, requested)
    }
    if (hasQueryLang) {
      params.delete(LANGUAGE_QUERY_PARAM)
    }

    const route = findAppRoute(pathname)
    const nextPathname = route !== undefined ? localizedPath(route.path, language) : pathname
    const nextSearch = hasQueryLang ? (params.size > 0 ? `?${params.toString()}` : '') : search

    if (nextPathname !== pathname || nextSearch !== search) {
      navigate(`${nextPathname}${nextSearch}${hash}`, { replace: true })
    }
  }, [pathname, search, hash, language, navigate])

  useEffect(() => {
    void i18n.changeLanguage(language)
    document.documentElement.lang = language
  }, [language, i18n])

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
