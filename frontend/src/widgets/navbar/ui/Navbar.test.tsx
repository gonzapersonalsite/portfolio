import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from '@/widgets/navbar'
import { LanguageProvider } from '@/features/language-switch'
import { ThemeProvider } from '@/features/theme-switch'
import { i18n } from '@/shared/config'

const renderNavbar = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <ThemeProvider>
          <Navbar />
        </ThemeProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )

describe('Navbar', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('en')
  })

  it.each(['/skills', '/skills/', '/SKILLS/'])('marks the current page in the desktop navigation at %s', (path) => {
    renderNavbar(path)

    const nav = within(screen.getByRole('banner')).getByRole('navigation', { name: 'Main navigation' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Home',
      'About',
      'Skills',
      'Experience',
      'Projects',
      'Contact',
    ])
    expect(
      links.filter((link) => link.getAttribute('aria-current') === 'page').map((link) => link.textContent),
    ).toEqual(['Skills'])
    expect(within(nav).getByRole('link', { current: 'page' }).getAttribute('href')).toBe('/skills')
  })

  it.each(['/projects', '/projects/', '/PROJECTS/'])('marks the current page in the mobile menu at %s', (path) => {
    renderNavbar(path)
    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(menuButton)

    expect(menuButton.getAttribute('aria-expanded')).toBe('true')
    const drawer = screen.getByRole('dialog', { name: 'Menu' })
    expect(menuButton.getAttribute('aria-controls')).toBe(drawer.id)
    expect(drawer.querySelector('p')?.textContent).toBe('GONZALO.DEV')
    const current = within(within(drawer).getByRole('navigation')).getByRole('link', { current: 'page' })
    expect(current.textContent).toBe('Projects')
    expect(current.getAttribute('href')).toBe('/projects')
  })

  it('does not mark a page for an unknown address sharing a route prefix', () => {
    renderNavbar('/projects/missing')

    const nav = within(screen.getByRole('banner')).getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).queryByRole('link', { current: 'page' })).toBeNull()
  })

  it.each(['Escape', 'navigation'] as const)('releases background ARIA hiding when closing via %s', (action) => {
    const { container } = renderNavbar('/skills')
    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    menuButton.focus()
    fireEvent.click(menuButton)

    const drawer = screen.getByRole('dialog', { name: 'Menu' })
    expect(drawer.contains(document.activeElement)).toBe(true)
    expect(container.getAttribute('aria-hidden')).toBe('true')

    if (action === 'Escape') {
      fireEvent.keyDown(drawer, { key: 'Escape' })
    } else {
      fireEvent.click(within(drawer).getByRole('link', { name: 'About' }))
    }

    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(menuButton)
    // Focus must not return to a hidden ancestor during the drawer's exit animation.
    expect(container.getAttribute('aria-hidden')).toBeNull()
  })
})
