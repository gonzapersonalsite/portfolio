import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SkillsPage from '@/pages/skills'
import { LanguageProvider } from '@/features/language-switch'
import { ThemeProvider } from '@/features/theme-switch'
import { i18n } from '@/shared/config'

const renderPage = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <ThemeProvider>
          <SkillsPage />
        </ThemeProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )

describe('SkillsPage', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('es')
  })

  it('replaces arbitrary percentages with concrete examples of where skills were applied', () => {
    const { container } = renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Conocimientos técnicos' })).toBeTruthy()
    expect(container.querySelectorAll('[role="progressbar"]')).toHaveLength(0)
    expect(screen.queryByText(/^\d+\s*%$/)).toBeNull()
    expect(screen.getByText('Globatecnic (2 PWA), tablero Kanban, Pokédex y este portafolio')).toBeTruthy()
  })
})
