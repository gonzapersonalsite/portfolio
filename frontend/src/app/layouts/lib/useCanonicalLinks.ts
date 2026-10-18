import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { absoluteUrl, findAppRoute, markdownTwinPath, SUPPORTED_LANGUAGES } from '@/shared/config'

const setAttribute = (selector: string, attribute: string, value: string) => {
  document.querySelector(selector)?.setAttribute(attribute, value)
}

// Each route shell carries its own canonical link, og:url and markdown alternates, but a
// client-side navigation keeps the tags of the page the visitor landed on, and Chrome on Android
// shares the canonical URL instead of the address bar. Point them at the current page. Only tags
// the shell already has are updated: the dev server and the 404 page have none.
export function useCanonicalLinks() {
  const { pathname } = useLocation()
  const path = findAppRoute(pathname)?.path

  useEffect(() => {
    if (path === undefined) return

    setAttribute('link[rel="canonical"]', 'href', absoluteUrl(path))
    setAttribute('meta[property="og:url"]', 'content', absoluteUrl(path))
    for (const language of SUPPORTED_LANGUAGES) {
      setAttribute(
        `link[rel="alternate"][type="text/markdown"][hreflang="${language}"]`,
        'href',
        absoluteUrl(markdownTwinPath(path, language)),
      )
    }
  }, [path])
}
