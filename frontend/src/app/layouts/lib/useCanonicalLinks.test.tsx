import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { useCanonicalLinks } from './useCanonicalLinks'

const SITE = 'https://mi-portafolio-gonzalo.vercel.app'

// The head of the home shell, as tooling/agent-files/shell.ts emits it.
const HOME_SHELL_HEAD = [
  `<link rel="canonical" href="${SITE}/">`,
  `<meta property="og:url" content="${SITE}/" />`,
  `<meta property="og:locale" content="en_US" />`,
  `<link rel="alternate" hreflang="en" href="${SITE}/">`,
  `<link rel="alternate" hreflang="es" href="${SITE}/es">`,
  `<link rel="alternate" hreflang="x-default" href="${SITE}/">`,
  `<link rel="alternate" type="text/markdown" hreflang="en" href="${SITE}/index.md">`,
  `<link rel="alternate" type="text/markdown" hreflang="es" href="${SITE}/index.es.md">`,
].join('')

const Layout: React.FC = () => {
  const navigate = useNavigate()
  useCanonicalLinks()
  return (
    <>
      <button type="button" onClick={() => navigate('/projects')}>
        projects
      </button>
      <button type="button" onClick={() => navigate('/es/projects')}>
        spanish projects
      </button>
      <button type="button" onClick={() => navigate('/nowhere')}>
        nowhere
      </button>
    </>
  )
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Layout />
    </MemoryRouter>,
  )

const headLinks = () => ({
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
  ogLocale: document.querySelector('meta[property="og:locale"]')?.getAttribute('content'),
  htmlEnglish: document.querySelector('link[rel="alternate"]:not([type])[hreflang="en"]')?.getAttribute('href'),
  htmlSpanish: document.querySelector('link[rel="alternate"]:not([type])[hreflang="es"]')?.getAttribute('href'),
  htmlDefault: document.querySelector('link[rel="alternate"]:not([type])[hreflang="x-default"]')?.getAttribute('href'),
  english: document.querySelector('link[type="text/markdown"][hreflang="en"]')?.getAttribute('href'),
  spanish: document.querySelector('link[type="text/markdown"][hreflang="es"]')?.getAttribute('href'),
})

describe('useCanonicalLinks', () => {
  beforeEach(() => {
    document.head.innerHTML = HOME_SHELL_HEAD
  })

  it('points the canonical, og:url, og:locale and alternates at the page after navigating', () => {
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'projects' }))

    expect(headLinks()).toEqual({
      canonical: `${SITE}/projects`,
      ogUrl: `${SITE}/projects`,
      ogLocale: 'en_US',
      htmlEnglish: `${SITE}/projects`,
      htmlSpanish: `${SITE}/es/projects`,
      htmlDefault: `${SITE}/projects`,
      english: `${SITE}/projects/index.md`,
      spanish: `${SITE}/projects/index.es.md`,
    })

    fireEvent.click(screen.getByRole('button', { name: 'spanish projects' }))

    expect(headLinks()).toEqual({
      canonical: `${SITE}/es/projects`,
      ogUrl: `${SITE}/es/projects`,
      ogLocale: 'es_ES',
      htmlEnglish: `${SITE}/projects`,
      htmlSpanish: `${SITE}/es/projects`,
      htmlDefault: `${SITE}/projects`,
      english: `${SITE}/projects/index.md`,
      spanish: `${SITE}/projects/index.es.md`,
    })
  })

  it('uses the canonical spelling of the path in both languages', () => {
    renderAt('/ES/About/')

    expect(headLinks().canonical).toBe(`${SITE}/es/about`)
    expect(headLinks().ogLocale).toBe('es_ES')
    expect(headLinks().spanish).toBe(`${SITE}/about/index.es.md`)
  })

  it('leaves the tags alone on an address that is not a page', () => {
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'nowhere' }))

    expect(headLinks().canonical).toBe(`${SITE}/`)
  })

  it('adds nothing when the page has no such tags (dev server, 404 page)', () => {
    document.head.innerHTML = ''
    renderAt('/skills')

    expect(document.head.innerHTML).toBe('')
  })
})
