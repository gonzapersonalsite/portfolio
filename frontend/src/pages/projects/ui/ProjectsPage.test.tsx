import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectsPage from '@/pages/projects'
import { getAllProjects } from '@/entities/project'
import { LanguageProvider } from '@/features/language-switch'
import { ThemeProvider } from '@/features/theme-switch'
import { i18n } from '@/shared/config'

const renderPage = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <ThemeProvider>
          <ProjectsPage />
        </ThemeProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )

describe('ProjectsPage', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('es')
  })

  it('shows dynamic platform filters derived from the catalog and filters cards accurately', () => {
    const allProjects = getAllProjects()
    const desktopProjects = allProjects.filter((project) => project.type === 'DESKTOP')

    renderPage()

    expect(screen.getAllByRole('article')).toHaveLength(allProjects.length)

    const allFilter = screen.getByRole('button', { name: /Todos/ })
    const desktopFilter = screen.getByRole('button', { name: /App de escritorio/ })
    expect(allFilter.getAttribute('aria-pressed')).toBe('true')
    expect(desktopFilter.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(desktopFilter)

    expect(allFilter.getAttribute('aria-pressed')).toBe('false')
    expect(desktopFilter.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getAllByRole('article')).toHaveLength(desktopProjects.length)
  })

  it('orders the platform filters as mobile, desktop and web, whatever the order of the catalog', () => {
    renderPage()

    const filters = within(screen.getByRole('group', { name: 'Filtrar por plataforma' })).getAllByRole('button')

    expect(filters.map((filter) => filter.textContent?.replace(/\s*\(\d+\)$/, ''))).toEqual([
      'Todos',
      'App móvil',
      'App de escritorio',
      'App web',
    ])
  })
})
