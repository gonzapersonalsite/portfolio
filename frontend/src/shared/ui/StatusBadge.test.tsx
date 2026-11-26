import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.removeProperty('font-size')
})

describe('StatusBadge', () => {
  it.each(['light', 'dark'] as const)(
    'renders an opaque status chip in %s mode without an interactive role',
    (mode) => {
      document.documentElement.dataset.theme = mode
      render(<StatusBadge label="Disponible para trabajar" />)

      const text = screen.getByText('Disponible para trabajar')
      const badge = text.closest('.status-badge')
      expect(badge).not.toBeNull()
      const icon = badge?.querySelector('svg')
      expect(icon?.getAttribute('aria-hidden')).toBe('true')
      expect(screen.queryByRole('button')).toBeNull()
    },
  )

  it("grows its dot with the reader's font size, like the label", () => {
    document.documentElement.style.fontSize = '24px'
    render(<StatusBadge label="Open to work" />)

    const dot = screen.getByText('Open to work').closest('.status-badge')!.querySelector('svg')!
    expect(getComputedStyle(dot).fontSize).toBe('18px')
  })
})
