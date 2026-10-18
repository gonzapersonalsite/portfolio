import { describe, expect, it } from 'vitest'
import i18n from '../../src/shared/config/i18n'
import { htmlFileOf, ROUTES, twinPathOf } from './routes'

describe('route specs', () => {
  it('mirror the English seo metadata the pages apply at runtime', () => {
    for (const route of ROUTES) {
      expect(route.shellTitle).toBe(i18n.t(`seo.${route.id}.title`, { lng: 'en' }))
      expect(route.shellDescription).toBe(i18n.t(`seo.${route.id}.description`, { lng: 'en' }))
    }
  })

  it('map every route to its HTML shell file', () => {
    expect(ROUTES.map(htmlFileOf)).toEqual([
      'index.html',
      'about/index.html',
      'skills/index.html',
      'experience/index.html',
      'projects/index.html',
      'contact/index.html',
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
