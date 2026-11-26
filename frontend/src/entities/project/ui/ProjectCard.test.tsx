import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { getAllProjects } from '../api/projectApi'
import { i18n } from '@/shared/config'
import ProjectCard from './ProjectCard'

const kanban = getAllProjects().find((project) => project.links.length > 1)!

const renderCard = (titleComponent?: 'h2' | 'h3') =>
  render(<ProjectCard project={kanban} titleComponent={titleComponent} />)

describe('ProjectCard', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    document.documentElement.style.removeProperty('font-size')
  })

  it('follows the interface language', async () => {
    if (!kanban) throw new Error('expected a project with several links')
    renderCard('h2')

    const card = screen.getByRole('article', { name: kanban.titleEn })
    expect(within(card).getByRole('heading', { level: 2 }).textContent).toBe(kanban.titleEn)
  })

  it('uses h3 when configured under a section heading', async () => {
    if (!kanban) throw new Error('expected a project with several links')
    await i18n.changeLanguage('es')
    renderCard('h3')

    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(kanban.titleEs)
  })

  it('links each external action to its own url and binds it to the card heading', () => {
    if (!kanban) throw new Error('expected a project with several links')
    renderCard('h3')

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(kanban.links.map((link) => link.url))
    const titleId = screen.getByRole('heading', { level: 3 }).id
    expect(links.every((link) => link.getAttribute('aria-describedby') === titleId)).toBe(true)
  })

  it('draws its high-contrast focus ring on the cover overlay without a redundant outer outline', () => {
    if (!kanban) throw new Error('expected a project with several links')
    const { container } = renderCard()
    const cover = screen.getByRole('button', { name: new RegExp(kanban.titleEn) })

    cover.focus()
    const originalMatches = cover.matches.bind(cover)
    Object.defineProperty(cover, 'matches', {
      configurable: true,
      value: (selector: string) => selector === ':focus-visible' || originalMatches(selector),
    })

    const overlay = getComputedStyle(container.querySelector<HTMLElement>('.preview-overlay')!)
    expect([overlay.outline, overlay.outlineOffset]).toEqual(['3px solid white', '-3px'])
    expect(overlay.boxShadow).toBe('inset 0 0 0 5px rgba(0, 0, 0, 0.87)')
    expect(getComputedStyle(cover).outline).toBe('none')
  })

  it("grows the gallery count mark with the reader's font size, like its number", () => {
    if (!kanban) throw new Error('expected a project with several links')
    document.documentElement.style.fontSize = '24px'
    const { container } = renderCard()

    const badge = container.querySelector('.project-card__gallery-badge')!
    const mark = badge.querySelector('svg')!
    expect(badge.textContent).toBe(String(kanban.images.length))
    expect(getComputedStyle(mark).fontSize).toBe('24px')
  })

  it('switches cleanly between Preview and Architecture Breakdown', () => {
    renderCard()

    const previewBtn = screen.getByRole('button', { name: 'Preview' })
    const archBtn = screen.getByRole('button', { name: 'Architecture' })
    expect(previewBtn.getAttribute('aria-pressed')).toBe('true')
    expect(archBtn.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(archBtn)

    expect(previewBtn.getAttribute('aria-pressed')).toBe('false')
    expect(archBtn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Architecture Breakdown')).toBeTruthy()
    expect(screen.getByText(kanban.architectureEn[0].label)).toBeTruthy()
    expect(screen.getByText(kanban.architectureEn[0].detail)).toBeTruthy()
  })
})
