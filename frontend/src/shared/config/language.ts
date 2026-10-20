// The UI is translated into these languages, and every content field comes as an En/Es pair.
export const SUPPORTED_LANGUAGES = ['en', 'es'] as const

export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'en'

export const LANGUAGE_STORAGE_KEY = 'language'

// `?lang=es|en` overrides the language on entry and redirects to the matching route URL.
export const LANGUAGE_QUERY_PARAM = 'lang'

// Accepts regional tags such as 'es-ES' and rejects any language the UI is not translated into.
export const toSupportedLanguage = (value: string | null | undefined): Language | null => {
  const base = value?.split('-')[0].toLowerCase()
  return SUPPORTED_LANGUAGES.find((language) => language === base) ?? null
}

export interface LanguageSources {
  path?: string | null
  query: string | null
  stored: string | null
  browser: string | null
}

// An explicit `?lang=` parameter or `/es` path wins over the visitor's saved choice, which wins over the browser setting.
export const resolveInitialLanguage = ({ path, query, stored, browser }: LanguageSources): Language =>
  toSupportedLanguage(query) ??
  toSupportedLanguage(path) ??
  toSupportedLanguage(stored) ??
  toSupportedLanguage(browser) ??
  DEFAULT_LANGUAGE
