import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AboutPage from '@/pages/about'
import { LanguageProvider } from '@/features/language-switch'
import { ThemeProvider } from '@/features/theme-switch'
import { i18n } from '@/shared/config'

const renderPage = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AboutPage />
        </ThemeProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )

describe('AboutPage', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('es')
  })

  it('lists each core competency once, grouped by category in the Skills page order', () => {
    renderPage()

    const section = screen.getByRole('heading', { level: 2, name: 'Competencias principales' }).parentElement
    if (!section) throw new Error('competencies section not rendered')
    const categories = Array.from(section.querySelectorAll('dt'), (term) => term.textContent)
    const chips = Array.from(section.querySelectorAll('.wb-chip'), (chip) => chip.textContent)
    const mobile = section.querySelectorAll('dt')[categories.indexOf('Móvil')]?.nextElementSibling

    expect(categories).toEqual(['Frontend', 'Backend', 'Móvil', 'Escritorio', 'Bases de datos'])
    expect(new Set(chips).size).toBe(chips.length)
    expect(Array.from(mobile?.querySelectorAll('.wb-chip') ?? [], (chip) => chip.textContent)).toEqual([
      'Flutter',
      'Dart',
    ])
  })

  it('captions the sentence that defines the author outside the quotation itself', () => {
    renderPage()

    const caption = screen.getByText('Una frase que me define')
    expect(caption.tagName).toBe('FIGCAPTION')
    expect(caption.parentElement?.querySelector('blockquote')?.textContent).toContain('revisa dos veces')
    expect(screen.queryByRole('heading', { name: 'Una frase que me define' })).toBeNull()
  })
})
