import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Button, Chip, Toolbar } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import CodeIcon from '@mui/icons-material/Code'
import { COLOR_MODES, createAppTheme } from './theme'

const inTheme = (children: React.ReactNode) =>
  render(<ThemeProvider theme={createAppTheme('light')}>{children}</ThemeProvider>)

// The text size a reader set in the browser: one and a half times the default.
const readerEnlargesTheText = () => {
  document.documentElement.style.fontSize = '24px'
}

afterEach(() => {
  cleanup()
  document.documentElement.style.removeProperty('font-size')
})

describe('the theme', () => {
  it.each(COLOR_MODES)(
    "counts the breakpoints of %s in the reader's text size, where MUI's are at the default",
    (mode) => {
      const { breakpoints } = createAppTheme(mode)
      const atTheDefaultSize = Object.fromEntries(
        Object.entries(breakpoints.values).map(([key, value]) => [key, value * 16]),
      )
      const belowSm = Number(/max-width:([\d.]+)rem/.exec(breakpoints.down('sm'))?.[1]) * 16

      expect(breakpoints.unit).toBe('rem')
      expect(atTheDefaultSize).toEqual({ xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 })
      expect(belowSm).toBeCloseTo(599.95, 5)
    },
  )

  it.each([
    ['small', '27px'],
    ['medium', '30px'],
    ['large', '33px'],
  ] as const)("grows the icon of a %s button with the reader's text size, like its label", (size, expected) => {
    readerEnlargesTheText()
    inTheme(
      <>
        <Button size={size} startIcon={<CodeIcon data-testid="start" />}>
          Before
        </Button>
        <Button size={size} endIcon={<CodeIcon data-testid="end" />}>
          After
        </Button>
      </>,
    )

    const sizes = ['start', 'end'].map((icon) => getComputedStyle(screen.getByTestId(icon)).fontSize)
    expect(sizes).toEqual([expected, expected])
  })

  it("grows a chip and the icon of a small one with the reader's text size, like its label", () => {
    readerEnlargesTheText()
    inTheme(
      <>
        <Chip label="Medium" />
        <Chip size="small" label="Small" icon={<CodeIcon data-testid="icon" />} />
      </>,
    )

    const chipOf = (label: string) => getComputedStyle(screen.getByText(label).closest('.MuiChip-root')!)
    expect([chipOf('Medium').height, chipOf('Small').height]).toEqual(['48px', '36px'])
    expect(getComputedStyle(screen.getByTestId('icon')).fontSize).toBe('27px')
  })

  it("grows the bar and the space kept under it with the reader's text size", () => {
    readerEnlargesTheText()
    inTheme(<Toolbar data-testid="bar" />)

    expect(getComputedStyle(screen.getByTestId('bar')).minHeight).toBe('84px')
  })

  it("leaves the keyboard focus of a button to the browser's own indicator", () => {
    inTheme(<Button>Send</Button>)
    const button = screen.getByRole('button', { name: 'Send' })

    button.focus()

    // What jsdom reports for a declaration it does not resolve; without it MUI's 'outline: 0' stands.
    expect(getComputedStyle(button).outline).toBe('revert')
  })
})
