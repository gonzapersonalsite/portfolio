import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { LanguageProvider, LanguageSelector } from '@/features/language-switch'
import { i18n } from '@/shared/config'

const PathProbe = () => <output data-testid="pathname">{useLocation().pathname}</output>

const renderSelector = (initialEntry = '/projects') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LanguageProvider>
        <LanguageSelector />
        <PathProbe />
      </LanguageProvider>
    </MemoryRouter>,
  )

describe('LanguageSelector', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('en')
  })

  it('is a menu button whose name says what it controls and keeps the visible code', () => {
    renderSelector()
    const button = screen.getByRole('button', { name: 'Language: English (EN)' })

    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.textContent).toContain('EN')
  })

  it('names every option in its own language and marks the current one', () => {
    renderSelector()
    const button = screen.getByRole('button', { name: /EN/ })
    fireEvent.click(button)

    const menu = screen.getByRole('menu', { name: 'Language: English (EN)' })
    const options = within(menu).getAllByRole('menuitemradio')
    expect(
      options.map((option) => [option.textContent, option.getAttribute('lang'), option.getAttribute('aria-checked')]),
    ).toEqual([
      ['English', 'en', 'true'],
      ['Español', 'es', 'false'],
    ])
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(button.getAttribute('aria-controls')).toBe(menu.closest('.MuiMenu-root')?.id)
  })

  it('switches the whole interface and the URL path to the chosen language', () => {
    renderSelector('/en/projects')
    fireEvent.click(screen.getByRole('button', { name: /EN/ }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Español' }))

    expect(screen.getByRole('button', { name: 'Idioma: Español (ES)' })).toBeTruthy()
    expect(document.documentElement.lang).toBe('es')
    expect(screen.getByTestId('pathname').textContent).toBe('/projects')
  })
})
