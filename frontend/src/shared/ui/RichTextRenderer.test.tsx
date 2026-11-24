import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import RichTextRenderer from './RichTextRenderer'

describe('RichTextRenderer', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('font-size')
  })

  it('renders each line as a paragraph and consecutive bullets as one list', () => {
    render(<RichTextRenderer text={'Tasks:\\n● First ● Second\\nDone'} />)

    expect(screen.getAllByRole('list')).toHaveLength(1)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['First', 'Second'])
    expect(screen.getByText('Tasks:').tagName).toBe('P')
    expect(screen.getByText('Done').tagName).toBe('P')
  })

  it('keeps a hyphen inside a sentence as text', () => {
    render(<RichTextRenderer text="Frontend - React" />)

    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.getByText('Frontend - React')).toBeTruthy()
  })

  it("grows each bullet with the reader's font size, like its line", () => {
    document.documentElement.style.fontSize = '24px'
    render(<RichTextRenderer text={'● First ● Second'} />)

    const bullets = screen.getAllByRole('listitem').map((item) => item.querySelector('svg')!)
    expect(bullets.map((bullet) => getComputedStyle(bullet).fontSize)).toEqual(['9px', '9px'])
  })

  it.each([
    ['body1', '15px'],
    ['body2', '10.5px'],
  ] as const)("moves the bullet of %s text %s down at a 24px reader's font size, with its line", (variant, offset) => {
    document.documentElement.style.fontSize = '24px'
    render(<RichTextRenderer text="● First" variant={variant} />)

    const bullet = screen.getByRole('listitem').querySelector('svg')!
    expect(getComputedStyle(bullet.parentElement!).marginTop).toBe(offset)
  })
})
