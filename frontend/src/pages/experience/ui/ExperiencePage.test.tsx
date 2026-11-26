import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ExperiencePage from '@/pages/experience'
import { LanguageProvider } from '@/features/language-switch'
import { ThemeProvider } from '@/features/theme-switch'
import { getAllExperiences } from '@/entities/experience'
import { i18n } from '@/shared/config'

const renderPage = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <ThemeProvider>
          <ExperiencePage />
        </ThemeProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )

describe('ExperiencePage', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('es')
  })

  it('shows the availability badge under the page heading', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Historial laboral')
    expect(screen.getByText('Disponible para trabajar')).toBeTruthy()
  })

  it('gives every role a level-2 heading, the company as text and a localised period', () => {
    renderPage()

    const roles = screen.getAllByRole('heading', { level: 2 })
    expect(roles).toHaveLength(getAllExperiences().length)
    expect(screen.queryByText(/^@/)).toBeNull()
    const internship = roles.find((role) => role.textContent === 'Prácticas formativas (CFGS)')
    const card = internship?.closest('article')
    if (!card) throw new Error('internship card not rendered')
    expect(within(card).getByText('Mistertransfer').tagName).toBe('P')
    expect(within(card).getAllByText('mar 2025 – jun 2025').length).toBeGreaterThan(0)
  })
})
