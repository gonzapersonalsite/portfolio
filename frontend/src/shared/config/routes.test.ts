import { describe, expect, it } from 'vitest'
import { findAppRoute, localizedPath, markdownTwinPath, pathnameLanguage } from './routes'

describe('routes', () => {
  it('detects the English route prefix regardless of case or trailing slashes', () => {
    expect(pathnameLanguage('/')).toBeNull()
    expect(pathnameLanguage('/projects')).toBeNull()
    expect(pathnameLanguage('/english')).toBeNull()
    expect(pathnameLanguage('/en')).toBe('en')
    expect(pathnameLanguage('/en/')).toBe('en')
    expect(pathnameLanguage('/EN/Projects/')).toBe('en')
  })

  it('builds Spanish root paths and English /en paths', () => {
    expect(localizedPath('/', 'es')).toBe('/')
    expect(localizedPath('/projects', 'es')).toBe('/projects')
    expect(localizedPath('/', 'en')).toBe('/en')
    expect(localizedPath('/projects', 'en')).toBe('/en/projects')
  })

  it('resolves canonical routes for both Spanish and English paths', () => {
    expect(findAppRoute('/')?.id).toBe('home')
    expect(findAppRoute('/en')?.id).toBe('home')
    expect(findAppRoute('/EN/')?.id).toBe('home')
    expect(findAppRoute('/projects')?.id).toBe('projects')
    expect(findAppRoute('/en/projects')?.id).toBe('projects')
    expect(findAppRoute('/EN/PROJECTS/')?.id).toBe('projects')
    expect(findAppRoute('/en/unknown')).toBeUndefined()
    expect(findAppRoute('/projects/unknown')).toBeUndefined()
  })

  it('maps canonical route paths to their English and Spanish markdown twins', () => {
    expect(markdownTwinPath('/', 'en')).toBe('/index.md')
    expect(markdownTwinPath('/', 'es')).toBe('/index.es.md')
    expect(markdownTwinPath('/about', 'en')).toBe('/about/index.md')
    expect(markdownTwinPath('/about', 'es')).toBe('/about/index.es.md')
  })
})
