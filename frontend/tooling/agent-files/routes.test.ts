import { describe, expect, it } from 'vitest'
import i18n from '../../src/shared/config/i18n'
import { htmlFileOf, LOCALES, ROUTES, twinPathOf } from './routes'

describe('route specs', () => {
  it('mirror the English and Spanish seo metadata the pages apply at runtime', () => {
    for (const route of ROUTES) {
      for (const locale of LOCALES) {
        expect(route.meta[locale].title).toBe(i18n.t(`seo.${route.id}.title`, { lng: locale }))
        expect(route.meta[locale].description).toBe(i18n.t(`seo.${route.id}.description`, { lng: locale }))
      }
      expect(route.shellTitle).toBe(route.meta.en.title)
      expect(route.shellDescription).toBe(route.meta.en.description)
    }
  })

  it('map every route to its English and Spanish HTML shell files', () => {
    expect(ROUTES.map((route) => htmlFileOf(route, 'en'))).toEqual([
      'index.html',
      'about/index.html',
      'skills/index.html',
      'experience/index.html',
      'projects/index.html',
      'contact/index.html',
    ])
    expect(ROUTES.map((route) => htmlFileOf(route, 'es'))).toEqual([
      'es/index.html',
      'es/about/index.html',
      'es/skills/index.html',
      'es/experience/index.html',
      'es/projects/index.html',
      'es/contact/index.html',
    ])
  })

  it('map every route to its English and Spanish markdown twins', () => {
    expect(ROUTES.map((route) => twinPathOf(route, 'en'))).toEqual([
      '/index.md',
      '/about/index.md',
      '/skills/index.md',
      '/experience/index.md',
      '/projects/index.md',
      '/contact/index.md',
    ])
    expect(ROUTES.map((route) => twinPathOf(route, 'es'))).toEqual([
      '/index.es.md',
      '/about/index.es.md',
      '/skills/index.es.md',
      '/experience/index.es.md',
      '/projects/index.es.md',
      '/contact/index.es.md',
    ])
  })
})
