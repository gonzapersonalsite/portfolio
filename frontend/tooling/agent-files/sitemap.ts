import { absoluteUrl, LOCALES, localizedPath, ROUTES } from './routes.ts'

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export const buildSitemap = (): string => {
  const urls = LOCALES.flatMap((locale) =>
    ROUTES.map(
      (route) => `  <url>\n    <loc>${escapeXml(absoluteUrl(localizedPath(route.path, locale)))}</loc>\n  </url>`,
    ),
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
