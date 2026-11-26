import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { i18n } from '@/shared/config'
import ProjectGallery, { type GallerySlide } from './ProjectGallery'

const slides: GallerySlide[] = [
  { src: '/images/first-full.webp', thumbSrc: '/images/first-thumb.webp', alt: 'First screenshot' },
  { src: '/images/second-full.webp', thumbSrc: '/images/second-thumb.webp', alt: 'Second screenshot' },
]

const renderGallery = (onClose = vi.fn()) =>
  render(<ProjectGallery title="Example project" slides={slides} onClose={onClose} />)

const currentImage = () => {
  const image = screen.getByRole('dialog').querySelector('img')
  if (!image) throw new Error('expected the current gallery image')
  return image
}

const finishLoading = (image = currentImage()) => {
  Object.defineProperties(image, {
    naturalWidth: { value: 1600, configurable: true },
    naturalHeight: { value: 900, configurable: true },
  })
  fireEvent.load(image)
}

describe('ProjectGallery', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('describes image loading without blocking navigation or closing', () => {
    const onClose = vi.fn()
    renderGallery(onClose)

    const viewer = screen.getByRole('region', { name: 'Image viewer' })
    const progress = screen.getByRole('progressbar', { name: 'Loading image…' })
    expect(viewer.getAttribute('aria-busy')).toBe('true')
    expect(viewer.getAttribute('aria-describedby')).toBe(progress.id)
    expect(viewer.contains(screen.getByRole('status'))).toBe(false)
    expect(screen.getByRole('status').textContent).toContain('Loading image…')
    expect(screen.getByRole('button', { name: 'Zoom in' }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByRole('img')).toBeNull()

    fireEvent.keyDown(window, { key: '+' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(currentImage().getAttribute('src')).toBe(slides[1].src)
    expect(screen.getByRole('button', { name: 'Reset zoom' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close gallery' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('reveals the loaded image and enables zoom without moving focus', () => {
    renderGallery()
    const next = screen.getByRole('button', { name: 'Next image' })
    next.focus()
    finishLoading()

    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByRole('img', { name: 'First screenshot' })).toBe(currentImage())
    expect(screen.getByRole('region').getAttribute('aria-busy')).toBe('false')
    expect(screen.getByRole('status').textContent).toContain('Image loaded.')
    expect(document.activeElement).toBe(next)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByRole('button', { name: 'Reset zoom' }).hasAttribute('disabled')).toBe(false)
  })

  it('recognizes an already cached image without waiting for another load event', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1600)
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(900)
    renderGallery()

    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByRole('img', { name: 'First screenshot' })).toBe(currentImage())
    expect(screen.getByRole('button', { name: 'Zoom in' }).hasAttribute('disabled')).toBe(false)
  })

  it('treats a complete but broken image as an error', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0)
    renderGallery()

    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('This image could not be loaded.')
    expect(screen.getByRole('button', { name: 'Try again' }).getAttribute('aria-disabled')).toBe('false')
    expect(screen.getByRole('button', { name: 'Zoom in' }).hasAttribute('disabled')).toBe(true)
  })

  it('offers a manual retry with the same URL and preserves keyboard focus through it', () => {
    renderGallery()
    const failedImage = currentImage()
    fireEvent.error(failedImage)
    const retry = screen.getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    const retriedImage = currentImage()

    expect(retriedImage).not.toBe(failedImage)
    expect(retriedImage.getAttribute('src')).toBe(slides[0].src)
    expect(retry.getAttribute('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(retry)
    fireEvent.click(retry)
    expect(currentImage()).toBe(retriedImage)
    finishLoading(retriedImage)

    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close gallery' }))
  })

  it('keeps a retry failure available and does not steal focus on later success', () => {
    renderGallery()
    fireEvent.error(currentImage())
    const retry = screen.getByRole('button', { name: 'Try again' })
    fireEvent.click(retry)
    fireEvent.error(currentImage())
    expect(retry.getAttribute('aria-disabled')).toBe('false')
    expect(screen.queryByRole('progressbar')).toBeNull()

    fireEvent.click(retry)
    const next = screen.getByRole('button', { name: 'Next image' })
    next.focus()
    finishLoading()
    expect(document.activeElement).toBe(next)
    expect(screen.getByRole('img', { name: 'First screenshot' })).toBe(currentImage())
  })

  it('ignores events from images and retry attempts that are no longer current', () => {
    renderGallery()
    const first = currentImage()
    fireEvent.error(first)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    const retry = currentImage()
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
    const second = currentImage()
    finishLoading(first)
    fireEvent.error(retry)

    expect(currentImage()).toBe(second)
    expect(screen.getByRole('progressbar', { name: 'Loading image…' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    finishLoading(second)
    fireEvent.error(first)
    expect(screen.getByRole('img', { name: 'Second screenshot' })).toBe(second)
  })

  it('resets loading and zoom when revisiting a slide, including during another pending request', () => {
    renderGallery()
    finishLoading()
    fireEvent.keyDown(window, { key: '+' })
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }))

    expect(currentImage().getAttribute('src')).toBe(slides[0].src)
    expect(screen.getByRole('progressbar', { name: 'Loading image…' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Reset zoom' }).hasAttribute('disabled')).toBe(true)
    finishLoading()
    expect(screen.getByRole('img', { name: 'First screenshot' })).toBe(currentImage())
  })

  it('keeps the current thumbnail usable without resetting a completed request', () => {
    renderGallery()
    finishLoading()
    fireEvent.click(screen.getByRole('button', { name: 'View image 1 of 2 (Example project)' }))

    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByRole('img', { name: 'First screenshot' })).toBe(currentImage())
  })

  it('preserves a stable focus target when navigating away from the retry button', () => {
    renderGallery()
    fireEvent.error(currentImage())
    screen.getByRole('button', { name: 'Try again' }).focus()
    fireEvent.keyDown(window, { key: 'ArrowRight' })

    expect(currentImage().getAttribute('src')).toBe(slides[1].src)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close gallery' }))
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })

  it('translates loading, failure and retry feedback', async () => {
    await i18n.changeLanguage('es')
    renderGallery()
    expect(screen.getByRole('progressbar', { name: 'Cargando imagen…' })).not.toBeNull()
    fireEvent.error(currentImage())
    expect(screen.getByRole('status').textContent).toContain('No se ha podido cargar esta imagen.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).not.toBeNull()
  })

  it('allows Escape during a failed load and restores focus to the gallery opener', async () => {
    function Example() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open gallery</button>
          {open && <ProjectGallery title="Example project" slides={slides} onClose={() => setOpen(false)} />}
        </>
      )
    }
    render(<Example />)
    const opener = screen.getByRole('button', { name: 'Open gallery' })
    opener.focus()
    fireEvent.click(opener)
    fireEvent.error(currentImage())
    fireEvent.keyDown(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close gallery' }), {
      key: 'Escape',
    })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)
  })

  it('zooms with keyboard and pans the viewer instead of switching slides', () => {
    renderGallery()
    finishLoading()

    const viewer = screen.getByRole('region', { name: 'Image viewer' })
    const scrollBy = vi.fn()
    Object.defineProperty(viewer, 'scrollBy', { value: scrollBy, configurable: true })

    fireEvent.keyDown(window, { key: '+' })
    expect(screen.getByRole('button', { name: 'Reset zoom' }).hasAttribute('disabled')).toBe(false)
    expect(viewer.tabIndex).toBe(0)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(scrollBy).toHaveBeenCalledWith({ left: 80, top: 0 })
    expect(currentImage().getAttribute('src')).toBe(slides[0].src)

    fireEvent.keyDown(window, { key: '-' })
    expect(screen.getByRole('button', { name: 'Reset zoom' }).hasAttribute('disabled')).toBe(true)
    expect(viewer.tabIndex).toBe(-1)

    fireEvent.keyDown(window, { key: '+' })
    fireEvent.keyDown(window, { key: '0' })
    expect(screen.getByRole('button', { name: 'Reset zoom' }).hasAttribute('disabled')).toBe(true)
  })

  it('switches slides on unzoomed horizontal touch swipe without triggering click-to-zoom', () => {
    renderGallery()
    finishLoading()

    const viewer = screen.getByRole('region', { name: 'Image viewer' })
    fireEvent.pointerDown(viewer, { pointerType: 'touch', clientX: 280, clientY: 160 })
    fireEvent.pointerUp(viewer, { pointerType: 'touch', clientX: 180, clientY: 165 })
    fireEvent.click(currentImage())

    expect(currentImage().getAttribute('src')).toBe(slides[1].src)
    expect(screen.getByRole('button', { name: 'Reset zoom' }).hasAttribute('disabled')).toBe(true)

    fireEvent.pointerDown(viewer, { pointerType: 'touch', clientX: 140, clientY: 160 })
    fireEvent.pointerUp(viewer, { pointerType: 'touch', clientX: 250, clientY: 165 })
    expect(currentImage().getAttribute('src')).toBe(slides[0].src)
  })

  it('closes on native cancel and backdrop fallback click and restores focus to the opener', async () => {
    function Example() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open gallery</button>
          {open && <ProjectGallery title="Example project" slides={slides} onClose={() => setOpen(false)} />}
        </>
      )
    }

    render(<Example />)
    const opener = screen.getByRole('button', { name: 'Open gallery' })
    opener.focus()
    fireEvent.click(opener)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)

    const closedByDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'closedBy')
    if (closedByDescriptor) {
      // Simulate browsers without closedby="any" support where pointer fallback handles outside clicks.
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'closedBy')
    }
    try {
      opener.focus()
      fireEvent.click(opener)
      const dialog = screen.getByRole('dialog')
      vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
        left: 20,
        right: 320,
        top: 20,
        bottom: 520,
        width: 300,
        height: 500,
        x: 20,
        y: 20,
        toJSON: () => ({}),
      })
      fireEvent.pointerDown(dialog, { clientX: 5, clientY: 5 })
      fireEvent.pointerUp(dialog, { clientX: 5, clientY: 5 })

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(document.activeElement).toBe(opener)
    } finally {
      if (closedByDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'closedBy', closedByDescriptor)
    }
  })
})
