import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { LanguageProvider, LanguageSelector } from '@/features/language-switch'
import { i18n } from '@/shared/config'

const PathProbe = () => <output data-testid="pathname">{useLocation().pathname}</output>

const renderSelector = (initialEntry = '/en/projects') =>
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

  it('renders a direct two-language toggle group named in each native language', () => {
    renderSelector()

    const group = screen.getByRole('group', { name: 'Language' })
    const buttons = within(group).getAllByRole('button')
    expect(
      buttons.map((button) => [
        button.getAttribute('aria-label'),
        button.getAttribute('lang'),
        button.getAttribute('aria-pressed'),
        button.textContent,
      ]),
    ).toEqual([
      ['Español', 'es', 'false', 'ES'],
      ['English', 'en', 'true', 'EN'],
    ])
  })

  it('switches the interface and navigates directly to the equivalent localized path', () => {
    renderSelector('/en/projects')
    fireEvent.click(screen.getByRole('button', { name: 'Español' }))

    expect(screen.getByRole('group', { name: 'Idioma' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Español' }).getAttribute('aria-pressed')).toBe('true')
    expect(document.documentElement.lang).toBe('es')
    expect(screen.getByTestId('pathname').textContent).toBe('/projects')
  })
})
