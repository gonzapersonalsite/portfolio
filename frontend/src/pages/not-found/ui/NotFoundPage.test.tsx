import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from '@/features/language-switch'
import { ThemeProvider } from '@/features/theme-switch'
import { i18n } from '@/shared/config'
import NotFoundPage from './NotFoundPage'

const renderNotFound = (initialEntry = '/missing-route') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LanguageProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/" element={<h1>Home Target</h1>} />
            <Route path="/en" element={<h1>English Home Target</h1>} />
            <Route path="/projects" element={<h1>Projects Target</h1>} />
            <Route path="/en/projects" element={<h1>English Projects Target</h1>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ThemeProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )

describe('NotFoundPage', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    window.localStorage.clear()
    await i18n.changeLanguage('es')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders the Spanish 404 heading, Linux bash diagnostics, bounded scroll area, noindex meta and home link on root unknown paths', () => {
    renderNotFound('/ruta-inexistente')

    expect(screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeTruthy()
    expect(screen.getByText(/bash: cd: \/ruta-inexistente:/)).toBeTruthy()
    expect(screen.getByTestId('terminal-scroll-area')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver al inicio' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: 'Ver proyectos' }).getAttribute('href')).toBe('/projects')
    expect(document.title).toBe('Página no encontrada | Gonzalo Martínez')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')
  })

  it('renders the English 404 copy and /en links when visiting an unknown /en/* path', () => {
    renderNotFound('/en/missing-page')

    expect(screen.getByRole('heading', { level: 1, name: 'Page Not Found' })).toBeTruthy()
    expect(screen.getByText(/bash: cd: \/en\/missing-page:/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to Home' }).getAttribute('href')).toBe('/en')
    expect(screen.getByRole('link', { name: 'View Projects' }).getAttribute('href')).toBe('/en/projects')
    expect(document.title).toBe('Page Not Found | Gonzalo Martínez')
  })

  it('executes interactive Linux terminal commands (help, ls, pwd, whoami, clear, and unknown)', () => {
    renderNotFound('/ruta-inexistente')

    const input = screen.getByRole('textbox', { name: 'Entrada de comandos de la terminal' })
    const form = input.closest('form')!

    fireEvent.change(input, { target: { value: 'help' } })
    fireEvent.submit(form)
    expect(screen.getByText(/Comandos disponibles: help · ls · pwd/)).toBeTruthy()

    fireEvent.change(input, { target: { value: 'ls' } })
    fireEvent.submit(form)
    expect(screen.getByText(/home\/\s+about\/\s+skills\//)).toBeTruthy()

    fireEvent.change(input, { target: { value: 'pwd' } })
    fireEvent.submit(form)
    expect(screen.getByText('/home/gonzalo/portfolio/ruta-inexistente')).toBeTruthy()

    fireEvent.change(input, { target: { value: 'whoami' } })
    fireEvent.submit(form)
    expect(screen.getByText(/gonzalo — Desarrollador Full Stack junior/)).toBeTruthy()

    fireEvent.change(input, { target: { value: 'comando-raro' } })
    fireEvent.submit(form)
    expect(screen.getByText(/bash: comando-raro: orden no encontrada/)).toBeTruthy()

    fireEvent.change(input, { target: { value: 'clear' } })
    fireEvent.submit(form)
    expect(screen.queryByText(/bash: comando-raro: orden no encontrada/)).toBeNull()
  })

  it('navigates when executing cd ~ or cd projects from the interactive terminal', () => {
    renderNotFound('/en/missing-page')

    const input = screen.getByRole('textbox', { name: 'Terminal command input' })
    const form = input.closest('form')!

    fireEvent.change(input, { target: { value: 'cd projects' } })
    fireEvent.submit(form)

    expect(screen.getByRole('heading', { level: 1, name: 'English Projects Target' })).toBeTruthy()
  })
})
