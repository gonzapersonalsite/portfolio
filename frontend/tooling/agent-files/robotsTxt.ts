import { absoluteUrl } from './routes.ts'

export const buildRobotsTxt = (): string => `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`
