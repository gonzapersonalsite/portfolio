import { describe, expect, it } from 'vitest'
import { findAppRoute, localizedPath, markdownTwinPath, pathnameLanguage } from './routes'

describe('routes', () => {
  it('detects the Spanish route prefix regardless of case or trailing slashes', () => {
    expect(pathnameLanguage('/')).toBeNull()
    expect(pathnameLanguage('/projects')).toBeNull()
    expect(pathnameLanguage('/espanol')).toBeNull()
    expect(pathnameLanguage('/es')).toBe('es')
    expect(pathnameLanguage('/es/')).toBe('es')
    expect(pathnameLanguage('/ES/Projects/')).toBe('es')
  })

  it('builds English root paths and Spanish /es paths', () => {
    expect(localizedPath('/', 'en')).toBe('/')
    expect(localizedPath('/projects', 'en')).toBe('/projects')
    expect(localizedPath('/', 'es')).toBe('/es')
    expect(localizedPath('/projects', 'es')).toBe('/es/projects')
  })

  it('resolves canonical routes for both English and Spanish paths', () => {
    expect(findAppRoute('/')?.id).toBe('home')
    expect(findAppRoute('/es')?.id).toBe('home')
    expect(findAppRoute('/ES/')?.id).toBe('home')
    expect(findAppRoute('/projects')?.id).toBe('projects')
    expect(findAppRoute('/es/projects')?.id).toBe('projects')
    expect(findAppRoute('/ES/PROJECTS/')?.id).toBe('projects')
    expect(findAppRoute('/es/unknown')).toBeUndefined()
    expect(findAppRoute('/projects/unknown')).toBeUndefined()
  })

  it('maps canonical route paths to their English and Spanish markdown twins', () => {
    expect(markdownTwinPath('/', 'en')).toBe('/index.md')
    expect(markdownTwinPath('/', 'es')).toBe('/index.es.md')
    expect(markdownTwinPath('/about', 'en')).toBe('/about/index.md')
    expect(markdownTwinPath('/about', 'es')).toBe('/about/index.es.md')
  })
})
