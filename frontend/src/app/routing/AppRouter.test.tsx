import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Outlet } from 'react-router-dom'
import { i18n } from '@/shared/config'
import { ErrorBoundary } from '@/shared/ui'
import AppRouter from './AppRouter'

vi.mock('../layouts', () => ({
  PublicLayout: () => (
    <>
      <Link to="/projects">Projects</Link>
      <Link to="/about">About</Link>
      <Outlet />
    </>
  ),
}))

vi.mock('@/pages/home', () => ({ default: () => <h1>Home page</h1> }))
vi.mock('@/pages/about', () => {
  throw new Error('Page chunk unavailable')
})
vi.mock('@/pages/skills', () => ({ default: () => <h1>Skills page</h1> }))
vi.mock('@/pages/experience', () => ({ default: () => <h1>Experience page</h1> }))
vi.mock('@/pages/projects', () => ({ default: () => <h1>Projects page</h1> }))
vi.mock('@/pages/contact', () => ({ default: () => <h1>Contact page</h1> }))
vi.mock('@/pages/not-found', () => ({ default: () => <h1>Not found page</h1> }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AppRouter page prefetch', () => {
  it('reports a speculative load failure without disrupting other pages and preserves the navigation error boundary', async () => {
    const requestIdleCallback = vi.fn<(callback: IdleRequestCallback) => number>().mockReturnValue(1)
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)
    vi.stubGlobal('cancelIdleCallback', vi.fn())
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <MemoryRouter>
          <AppRouter />
        </MemoryRouter>
      </ErrorBoundary>,
    )
    expect(await screen.findByRole('heading', { name: 'Home page' })).toBeTruthy()

    act(() => requestIdleCallback.mock.calls[0][0]({ didTimeout: false, timeRemaining: () => 50 }))

    await waitFor(() =>
      expect(warning).toHaveBeenCalledWith({
        event: 'page-prefetch-failed',
        route: '/about',
        error: expect.any(Error),
      }),
    )
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: 'Projects' }))
    expect(await screen.findByRole('heading', { name: 'Projects page' })).toBeTruthy()

    fireEvent.click(screen.getByRole('link', { name: 'About' }))
    expect(await screen.findByRole('heading', { name: i18n.t('common.errorBoundaryTitle') })).toBeTruthy()
    expect(error).toHaveBeenCalledWith('ErrorBoundary caught an error:', expect.any(Error), expect.any(Object))
  })

  it('renders the custom 404 page inside PublicLayout for unknown routes', async () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <AppRouter />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Not found page' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Projects' })).toBeTruthy()
  })
})
