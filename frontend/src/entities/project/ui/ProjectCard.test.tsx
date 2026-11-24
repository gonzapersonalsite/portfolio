import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ProjectCard, getAllProjects } from '@/entities/project'
import { i18n } from '@/shared/config'

const kanban = getAllProjects().find((project) => project.links.length > 1)

describe('ProjectCard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    document.documentElement.style.removeProperty('font-size')
  })

  it('names the card with its title at the requested heading level', () => {
    if (!kanban) throw new Error('expected a project with several links')
    render(<ProjectCard project={kanban} titleComponent="h2" />)

    const card = screen.getByRole('article', { name: kanban.titleEn })
    expect(within(card).getByRole('heading', { level: 2 }).textContent).toBe(kanban.titleEn)
  })

  it('follows the interface language', async () => {
    if (!kanban) throw new Error('expected a project with several links')
    await i18n.changeLanguage('es')
    render(<ProjectCard project={kanban} />)

    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(kanban.titleEs)
  })

  it('renders one button per link, in data order, described by the card title', () => {
    if (!kanban) throw new Error('expected a project with several links')
    render(<ProjectCard project={kanban} />)

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(kanban.links.map((link) => link.url))
    const titleId = screen.getByRole('heading', { level: 3 }).id
    expect(links.every((link) => link.getAttribute('aria-describedby') === titleId)).toBe(true)
  })

  it('draws the ring of the focused cover on its overlay, white with a dark band inside, so it shows on a white screenshot', () => {
    if (!kanban) throw new Error('expected a project with several links')
    const { container } = render(<ProjectCard project={kanban} />)
    const cover = screen.getByRole('button', { name: new RegExp(kanban.titleEn) })

    cover.focus()

    // The overlay is painted above the button: a ring of the button's own would lie under it.
    const overlay = getComputedStyle(container.querySelector<HTMLElement>('.preview-overlay')!)
    expect([overlay.outline, overlay.outlineOffset]).toEqual(['3px solid white', '-3px'])
    expect(overlay.boxShadow).toBe('inset 0 0 0 5px rgba(0, 0, 0, 0.87)')
    expect(getComputedStyle(cover).outline).toBe('none')
  })

  it("grows the gallery mark of the cover with the reader's font size, like its count", () => {
    if (!kanban) throw new Error('expected a project with several links')
    document.documentElement.style.fontSize = '24px'
    const { container } = render(<ProjectCard project={kanban} />)

    const mark = container.querySelector('svg[data-testid="PhotoLibraryIcon"]')!
    expect(mark.parentElement?.textContent).toBe(String(kanban.images.length))
    expect(getComputedStyle(mark).fontSize).toBe('24px')
  })
})
