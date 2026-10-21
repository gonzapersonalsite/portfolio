import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ImageWithFallback from './ImageWithFallback'

describe('ImageWithFallback', () => {
  it('reserves the box with the aspect ratio and sets intrinsic HTML width and height before the image loads', () => {
    render(<ImageWithFallback src="/images/a-800.webp" alt="Cover" type="project" aspectRatio="16/9" />)

    const image = screen.getByRole('img', { name: 'Cover' })
    const box = image.parentElement
    expect(box ? getComputedStyle(box).aspectRatio.replace(/\s/g, '') : '').toBe('16/9')
    expect(image.getAttribute('width')).toBe('16')
    expect(image.getAttribute('height')).toBe('9')
  })

  it('renders eager LCP images immediately visible without an opacity transition delay', () => {
    render(
      <ImageWithFallback
        src="/images/a-800.webp"
        alt="Priority Cover"
        type="project"
        aspectRatio="16/9"
        loading="eager"
      />,
    )

    const image = screen.getByRole('img', { name: 'Priority Cover' })
    expect(getComputedStyle(image).opacity).toBe('1')
    expect(getComputedStyle(image).transition).toBe('none')
  })

  it('swaps in the local fallback, srcset included, when the image fails', () => {
    render(
      <ImageWithFallback
        src="/images/a-800.webp"
        srcSet="/images/a-800.webp 800w, /images/a-full.webp 1600w"
        alt="Cover"
        type="project"
        aspectRatio="16/9"
      />,
    )
    const image = screen.getByRole('img', { name: 'Cover' })

    fireEvent.error(image)

    expect(image.getAttribute('src')).toBe('/images/no-image.svg')
    expect(image.hasAttribute('srcset')).toBe(false)
  })

  it('uses the profile fallback for profile photos without a source', () => {
    render(<ImageWithFallback alt="Gonzalo" type="profile" aspectRatio="2/3" />)

    const image = screen.getByRole('img', { name: 'Gonzalo' })
    expect(image.getAttribute('src')).toBe('/profile-fallback.webp')
    expect(image.getAttribute('width')).toBe('2')
    expect(image.getAttribute('height')).toBe('3')
  })
})
