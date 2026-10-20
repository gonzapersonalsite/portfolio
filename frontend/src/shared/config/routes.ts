import type { Language } from './language.ts'

// The single list of pages: the router, the navigation menus and the build-time route shells
// (tooling/agent-files/routes.ts) all derive from it, in this order.
export const APP_ROUTES = [
  { id: 'home', path: '/' },
  { id: 'about', path: '/about' },
  { id: 'skills', path: '/skills' },
  { id: 'experience', path: '/experience' },
  { id: 'projects', path: '/projects' },
  { id: 'contact', path: '/contact' },
] as const

export type RouteId = (typeof APP_ROUTES)[number]['id']

type AppRoute = (typeof APP_ROUTES)[number]

const normalizePathname = (pathname: string): string =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '').toLowerCase() : pathname

// English routes live under `/en` (`/en` and `/en/<page>`); Spanish routes keep the root paths.
export const pathnameLanguage = (pathname: string): Language | null => {
  const normalized = normalizePathname(pathname)
  return normalized === '/en' || normalized.startsWith('/en/') ? 'en' : null
}

export const localizedPath = (path: string, language: Language): string => {
  if (language === 'es') return path
  return path === '/' ? `/${language}` : `/${language}${path}`
}

// The router matches paths case-insensitively, with or without `/en` and with a trailing slash;
// this returns the canonical route definition, or undefined for an address that is not a page.
export const findAppRoute = (pathname: string): AppRoute | undefined => {
  const normalized = normalizePathname(pathname)
  const basePath = normalized === '/en' ? '/' : normalized.startsWith('/en/') ? normalized.slice(3) : normalized
  return APP_ROUTES.find((route) => route.path === basePath)
}

// Every page has a markdown twin per language, generated at build time (tooling/agent-files):
// '/' -> '/index.md' and '/index.es.md', '/about' -> '/about/index.md' and '/about/index.es.md'.
export const markdownTwinPath = (path: string, language: Language): string => {
  const directory = path === '/' ? '/' : `${path}/`
  return `${directory}index${language === 'en' ? '' : `.${language}`}.md`
}
