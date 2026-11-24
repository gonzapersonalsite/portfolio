import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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

  afterEach(() => {
    document.documentElement.style.removeProperty('font-size')
  })

  it("grows the icon of each competency group with the reader's font size, like its heading", () => {
    document.documentElement.style.fontSize = '24px'
    renderPage()

    const icons = ['Frontend', 'Backend'].map(
      (group) => screen.getByRole('heading', { level: 3, name: group }).parentElement?.previousElementSibling,
    )
    expect(icons.map((icon) => icon?.tagName)).toEqual(['svg', 'svg'])
    expect(icons.map((icon) => icon && getComputedStyle(icon).fontSize)).toEqual(['48px', '48px'])
  })
})
