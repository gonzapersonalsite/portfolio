import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  absoluteUrl,
  findAppRoute,
  localizedPath,
  markdownTwinPath,
  pathnameLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
} from '@/shared/config'

const setAttribute = (selector: string, attribute: string, value: string) => {
  document.querySelector(selector)?.setAttribute(attribute, value)
}

const ogLocaleOf = (language: Language): string => (language === 'es' ? 'es_ES' : 'en_US')

// Each route shell carries its own canonical link, og:url, og:locale, HTML hreflang alternates
// and markdown alternates, but a client-side navigation keeps the tags of the page the visitor
// landed on, and Chrome on Android shares the canonical URL instead of the address bar. Point
// them at the current localized page. Only tags the shell already has are updated: the dev
// server and the 404 page have none.
export function useCanonicalLinks() {
  const { pathname } = useLocation()
  const route = findAppRoute(pathname)
  const language: Language = pathnameLanguage(pathname) ?? 'en'

  useEffect(() => {
    if (route === undefined) return

    const currentUrl = absoluteUrl(localizedPath(route.path, language))
    setAttribute('link[rel="canonical"]', 'href', currentUrl)
    setAttribute('meta[property="og:url"]', 'content', currentUrl)
    setAttribute('meta[property="og:locale"]', 'content', ogLocaleOf(language))
    for (const locale of SUPPORTED_LANGUAGES) {
      setAttribute(
        `link[rel="alternate"]:not([type])[hreflang="${locale}"]`,
        'href',
        absoluteUrl(localizedPath(route.path, locale)),
      )
      setAttribute(
        `link[rel="alternate"][type="text/markdown"][hreflang="${locale}"]`,
        'href',
        absoluteUrl(markdownTwinPath(route.path, locale)),
      )
    }
    setAttribute(
      'link[rel="alternate"]:not([type])[hreflang="x-default"]',
      'href',
      absoluteUrl(localizedPath(route.path, 'en')),
    )
  }, [route, language])
}
