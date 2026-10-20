import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { useRouteChangeFocus } from './useRouteChangeFocus'

const Layout: React.FC = () => {
  const navigate = useNavigate()
  useRouteChangeFocus('main')
  return (
    <>
      <button type="button" onClick={() => navigate('/about')}>
        about
      </button>
      <button type="button" onClick={() => navigate('/about#main')}>
        skip
      </button>
      <button type="button" onClick={() => navigate('/es/about')}>
        spanish
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
      <main id="main" tabIndex={-1}>
        Content
      </main>
    </>
  )
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Layout />
    </MemoryRouter>,
  )

const press = (name: string) => {
  const button = screen.getByRole('button', { name })
  button.focus()
  fireEvent.click(button)
  return button
}

describe('useRouteChangeFocus', () => {
  let scrollTo: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('leaves the first page load alone', () => {
    renderAt('/')

    expect(scrollTo).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(document.body)
  })

  it('starts a new page at the top with the focus on the main region', () => {
    renderAt('/')

    press('about')

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(document.activeElement).toBe(screen.getByRole('main'))
  })

  it('ignores changes that keep the page, such as the skip link hash or a language switch', () => {
    renderAt('/about')

    const skip = press('skip')

    expect(scrollTo).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(skip)

    const spanish = press('spanish')

    expect(scrollTo).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(spanish)
  })

  it('keeps the browser behaviour on back and forward', () => {
    renderAt('/')
    press('about')
    scrollTo.mockClear()

    const back = press('back')

    expect(scrollTo).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(back)
  })
})
