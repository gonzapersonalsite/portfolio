import { describe, it, expect } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useFindableDisclosure } from './useFindableDisclosure'

const Disclosure = () => {
  const { expanded, toggle, contentRef } = useFindableDisclosure<HTMLDivElement>()
  return (
    <>
      <button type="button" aria-expanded={expanded} onClick={toggle}>
        toggle
      </button>
      <div ref={contentRef} data-testid="content">
        more
      </div>
    </>
  )
}

describe('useFindableDisclosure', () => {
  it('starts collapsed and keeps the content findable', () => {
    render(<Disclosure />)

    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByTestId('content').getAttribute('hidden')).toBe('until-found')
  })

  it('toggles the content open and closed', () => {
    render(<Disclosure />)
    const button = screen.getByRole('button')

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByTestId('content').hasAttribute('hidden')).toBe(false)

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByTestId('content').getAttribute('hidden')).toBe('until-found')
  })

  it('expands when find-in-page matches the hidden content', () => {
    render(<Disclosure />)
    const content = screen.getByTestId('content')

    act(() => {
      content.dispatchEvent(new Event('beforematch', { bubbles: true }))
    })

    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
    expect(content.hasAttribute('hidden')).toBe(false)
  })
})
