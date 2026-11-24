import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { createAppTheme } from '@/shared/config'
import StatusBadge from './StatusBadge'

afterEach(() => {
  cleanup()
  document.documentElement.style.removeProperty('font-size')
})

describe('StatusBadge', () => {
  it.each([
    ['light', 'rgb(46, 125, 50)', 'rgb(237, 247, 237)'],
    ['dark', 'rgb(102, 187, 106)', 'rgb(16, 38, 27)'],
    ['glass', 'rgb(102, 187, 106)', 'rgb(16, 38, 27)'],
  ] as const)('keeps the green status on an opaque surface in %s mode', (mode, color, background) => {
    render(
      <ThemeProvider theme={createAppTheme(mode)}>
        <StatusBadge label="Disponible para trabajar" />
      </ThemeProvider>,
    )

    const badge = screen.getByText('Disponible para trabajar').closest('.MuiChip-root')!
    const style = getComputedStyle(badge)
    expect(style.color).toBe(color)
    expect(style.backgroundColor).toBe(background)
    expect(getComputedStyle(badge.querySelector('svg')!).color).toBe(color)
    expect(badge.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it("grows its dot with the reader's font size, like the label", () => {
    document.documentElement.style.fontSize = '24px'
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <StatusBadge label="Open to work" />
      </ThemeProvider>,
    )

    const dot = screen.getByText('Open to work').closest('.MuiChip-root')!.querySelector('svg')!
    expect(getComputedStyle(dot).fontSize).toBe('18px')
  })
})
