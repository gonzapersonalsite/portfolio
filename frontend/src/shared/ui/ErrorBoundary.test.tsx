import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'
import { i18n } from '@/shared/config'

const Broken = () => {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('replaces a crashed tree with a page of its own: main region, heading and a way home', async () => {
    await i18n.changeLanguage('en')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )

    const main = screen.getByRole('main')
    expect(main.querySelector('h1')?.textContent).toBe('Something went wrong')
    expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go to Home Page' }).getAttribute('href')).toBe('/')
  })

  it('points the way home to /es when the active language is Spanish', async () => {
    await i18n.changeLanguage('es')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('link', { name: 'Ir a la página de inicio' }).getAttribute('href')).toBe('/es')
  })
})
