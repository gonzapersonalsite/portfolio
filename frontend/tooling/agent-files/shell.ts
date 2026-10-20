import { getProfile } from '../../src/entities/profile/api/profileApi.ts'
import { getCoreSkills } from '../../src/entities/skill/api/skillApi.ts'
import { getAllSpokenLanguages } from '../../src/entities/spoken-language/api/languageApi.ts'
import {
  absoluteUrl,
  HOME_ROUTE,
  LOCALES,
  localizedPath,
  twinPathOf,
  type ImagePreload,
  type Locale,
  type RouteSpec,
} from './routes.ts'

const OG_LOCALES: Record<Locale, string> = {
  en: 'en_US',
  es: 'es_ES',
}

const STARTUP_PROGRESS_LABEL: Record<Locale, string> = {
  en: 'Loading portfolio',
  es: 'Cargando portafolio',
}

const HEAD_END = '</head>'
const APP_ROOT = '<div id="root">'

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const WEBSITE_ID = absoluteUrl('/#website')
const PERSON_ID = absoluteUrl('/#person')

// The site and the person it presents, linked by @id. knowsAbout holds the core competencies,
// the same skills the About page lists.
const structuredData = (): string => {
  const profile = getProfile()

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: absoluteUrl('/'),
        name: `${profile.fullNameEn} – Portfolio`,
        inLanguage: LOCALES,
        publisher: { '@id': PERSON_ID },
      },
      {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: profile.fullNameEn,
        alternateName: profile.alternateName,
        jobTitle: profile.subtitleEn,
        description: profile.descriptionEn,
        url: absoluteUrl('/'),
        image: absoluteUrl(profile.imageUrl),
        email: profile.email,
        homeLocation: { '@type': 'Place', name: profile.locationEn },
        knowsAbout: getCoreSkills().map((skill) => skill.nameEn),
        knowsLanguage: getAllSpokenLanguages().map((language) => language.nameEn),
        sameAs: [profile.githubUrl, profile.linkedinUrl],
      },
    ],
  }

  // '<' never reaches the HTML parser, so no text can close the <script> element early.
  return JSON.stringify(graph).replace(/</g, '\\u003c')
}

const htmlAttribute = (name: string, value: string | undefined): string[] =>
  value === undefined ? [] : [`${name}="${escapeHtml(value)}"`]

// imagesrcset/imagesizes make the preload pick the same candidate the <img> srcset will.
const preloadImageLink = (image: ImagePreload): string =>
  [
    '<link rel="preload" as="image"',
    ...htmlAttribute('href', image.src),
    ...htmlAttribute('imagesrcset', image.srcSet),
    ...htmlAttribute('imagesizes', image.sizes),
    'fetchpriority="high">',
  ].join(' ')

const headBlock = (route: RouteSpec, locale: Locale): string =>
  [
    `<link rel="canonical" href="${absoluteUrl(localizedPath(route.path, locale))}">`,
    ...LOCALES.map(
      (target) =>
        `<link rel="alternate" hreflang="${target}" href="${absoluteUrl(localizedPath(route.path, target))}">`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${absoluteUrl(localizedPath(route.path, 'es'))}">`,
    ...LOCALES.map(
      (target) =>
        `<link rel="alternate" type="text/markdown" hreflang="${target}" href="${absoluteUrl(twinPathOf(route, target))}">`,
    ),
    ...(route.lcpImage === undefined ? [] : [preloadImageLink(route.lcpImage())]),
    `<script type="application/ld+json">${structuredData()}</script>`,
  ].join('\n')

// Without JavaScript the SPA renders nothing; say who this is and link the page's markdown twins.
const noscriptBlock = (route: RouteSpec): string => {
  const profile = getProfile()
  const english = twinPathOf(route, 'en')
  const spanish = twinPathOf(route, 'es')

  return [
    '<noscript>',
    '<div class="noscript-fallback">',
    `<h1>${escapeHtml(profile.fullNameEn)}</h1>`,
    `<p>${escapeHtml(profile.subtitleEn)}</p>`,
    `<p>This site needs JavaScript. A text version is available in <a href="${english}">English</a> and <a href="${spanish}" hreflang="es">Spanish</a>.</p>`,
    `<p lang="es">Este sitio necesita JavaScript. Hay una versión en texto en <a href="${spanish}">español</a> y en <a href="${english}" hreflang="en">inglés</a>.</p>`,
    `<p><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a></p>`,
    '</div>',
    '</noscript>',
  ].join('\n')
}

// index.html is the only HTML source; a shell is wrong the moment a marker it expects
// disappears, so every edit refuses anything but one match.
const replaceOnce = (html: string, pattern: RegExp, replacement: string, what: string): string => {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const matches = html.match(new RegExp(pattern.source, flags)) ?? []
  if (matches.length !== 1) {
    throw new Error(`agent-files: expected exactly one ${what}, found ${matches.length}`)
  }

  return html.replace(pattern, () => replacement)
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const insertBefore = (html: string, marker: string, block: string): string =>
  replaceOnce(html, new RegExp(escapeRegExp(marker)), `${block}\n${marker}`, marker)

const updateMeta = (
  html: string,
  attribute: 'name' | 'property',
  name: string,
  update: (content: string) => string,
): string => {
  const matches = [...html.matchAll(new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"\\s*/>`, 'g'))]
  if (matches.length !== 1) {
    throw new Error(`agent-files: expected exactly one meta ${name}, found ${matches.length}`)
  }

  const [tag, content] = matches[0]
  return html.replace(tag, () => `<meta ${attribute}="${name}" content="${escapeHtml(update(content))}" />`)
}

// index.html names the social image by its path, so the site address has one source (SITE_URL).
const absoluteImagePath =
  (name: string) =>
  (path: string): string => {
    if (!path.startsWith('/')) {
      throw new Error(`agent-files: ${name} must be a root-relative path, found "${path}"`)
    }
    return absoluteUrl(path)
  }

// The title, description and social metadata of every shell, the home page included, come from
// routes.ts; the values in index.html only serve the dev server.
const applyRouteMeta = (html: string, route: RouteSpec, locale: Locale): string => {
  const { title, description } = route.meta[locale]
  const pageUrl = absoluteUrl(localizedPath(route.path, locale))
  let result = replaceOnce(html, /<html lang="en">/, `<html lang="${locale}">`, '<html lang="en">')
  result = replaceOnce(result, /<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`, '<title>')
  result = replaceOnce(
    result,
    /<progress aria-label="Loading portfolio"><\/progress>/,
    `<progress aria-label="${escapeHtml(STARTUP_PROGRESS_LABEL[locale])}"></progress>`,
    '<progress aria-label="Loading portfolio">',
  )
  result = updateMeta(result, 'name', 'description', () => description)
  result = updateMeta(result, 'property', 'og:title', () => title)
  result = updateMeta(result, 'property', 'og:description', () => description)
  result = updateMeta(result, 'property', 'og:url', () => pageUrl)
  result = updateMeta(result, 'property', 'og:locale', () => OG_LOCALES[locale])
  result = updateMeta(result, 'property', 'og:image', absoluteImagePath('og:image'))
  return updateMeta(result, 'name', 'twitter:image', absoluteImagePath('twitter:image'))
}

export const buildRouteShell = (template: string, route: RouteSpec, locale: Locale = 'es'): string =>
  applyRouteMeta(
    insertBefore(insertBefore(template, HEAD_END, headBlock(route, locale)), APP_ROOT, noscriptBlock(route)),
    route,
    locale,
  )

// Served by Vercel with status 404 for any other address. It is not a page of the site, so it has
// no canonical link or markdown alternates; with JavaScript the router sends the visitor home.
export const buildNotFoundPage = (template: string): string =>
  applyRouteMeta(
    insertBefore(
      insertBefore(template, HEAD_END, '<meta name="robots" content="noindex">'),
      APP_ROOT,
      noscriptBlock(HOME_ROUTE),
    ),
    HOME_ROUTE,
    'es',
  )
