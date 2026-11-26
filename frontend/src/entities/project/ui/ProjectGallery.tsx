import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fitSize, type Size } from '../lib/fitSize'
import './ProjectGallery.css'

export interface GallerySlide {
  src: string
  thumbSrc: string
  alt: string
}

interface ProjectGalleryProps {
  title: string
  slides: GallerySlide[]
  onClose: () => void
}

type ImageState = { src: string; attempt: number } & (
  { status: 'loading' | 'error' } | { status: 'loaded'; size: Size }
)

const MAX_ZOOM = 4
const ZOOM_STEP = 0.5
const PAN_STEP_PX = 80
const SWIPE_THRESHOLD_PX = 48

// While zoomed, the arrow keys pan the image instead of changing it.
const PAN_DIRECTIONS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

const isOutsideRect = (dialog: HTMLDialogElement, event: React.PointerEvent<HTMLDialogElement>): boolean => {
  const rect = dialog.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return false
  return (
    event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
  )
}

const IconSvg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    aria-hidden="true"
    className="project-gallery-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

const ProjectGallery: React.FC<ProjectGalleryProps> = ({ title, slides, onClose }) => {
  const { t } = useTranslation()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [imageState, setImageState] = useState<ImageState>({ src: slides[0].src, attempt: 0, status: 'loading' })
  const [viewportSize, setViewportSize] = useState<Size | null>(null)
  const [dragging, setDragging] = useState(false)

  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const closingRef = useRef(false)
  const pressedOutsideRef = useRef(false)
  const suppressClickRef = useRef(false)

  const viewportRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const retryButtonRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([])

  const titleId = useId()
  const progressId = useId()

  // Point of the image, as a fraction of the scrollable area, that stays centred across zoom changes.
  const focalPoint = useRef({ x: 0.5, y: 0.5 })
  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const total = slides.length
  const slide = slides[currentIndex]
  const currentImage = imageState.src === slide.src && imageState.attempt === attempt
  const imageStatus = currentImage ? imageState.status : 'loading'
  const imageStatusLabel = t(
    {
      loading: 'projects.gallery.loading',
      loaded: 'projects.gallery.loaded',
      error: 'projects.gallery.loadError',
    }[imageStatus],
  )
  const imageReady = imageStatus === 'loaded'
  const zoomed = imageReady && zoomLevel > 1
  const fittedSize =
    currentImage && imageState.status === 'loaded' && viewportSize ? fitSize(imageState.size, viewportSize) : null

  const closeGallery = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    const dialog = dialogRef.current
    if (dialog?.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
    const opener = openerRef.current
    onClose()
    if (opener?.isConnected && document.activeElement !== opener) {
      opener.focus()
    }
  }, [onClose])

  // Open on the browser top layer via showModal() so inertness, Esc, and focus restoration are native.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    closingRef.current = false
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.setAttribute('closedby', 'any')

    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal()
      } else {
        dialog.setAttribute('open', '')
      }
    }

    if (!dialog.contains(document.activeElement)) {
      closeButtonRef.current?.focus()
    }
  }, [])

  const moveFocusFromRetry = useCallback(() => {
    // The retry button disappears after success or navigation; preserve a stable focus target.
    if (retryButtonRef.current === document.activeElement) closeButtonRef.current?.focus()
  }, [])

  const settleImage = useCallback(
    (image: HTMLImageElement, status: 'loaded' | 'error') => {
      // An earlier image or retry can finish after the visitor has moved on.
      if (imageRef.current !== image) return
      if (status === 'loaded') {
        moveFocusFromRetry()
        setImageState({
          src: slide.src,
          attempt,
          status,
          size: { width: image.naturalWidth, height: image.naturalHeight },
        })
      } else {
        setImageState({ src: slide.src, attempt, status })
      }
    },
    [slide.src, attempt, moveFocusFromRetry],
  )

  const attachImage = useCallback(
    (image: HTMLImageElement | null) => {
      imageRef.current = image
      // Cached resources may already be complete; a broken image is also "complete".
      if (image?.complete) settleImage(image, image.naturalWidth > 0 ? 'loaded' : 'error')
      return () => {
        if (imageRef.current === image) imageRef.current = null
      }
    },
    [settleImage],
  )

  const changeZoom = useCallback(
    (next: (current: number) => number) => {
      if (!imageReady) return
      const viewport = viewportRef.current
      if (viewport) {
        focalPoint.current = {
          x: (viewport.scrollLeft + viewport.clientWidth / 2) / (viewport.scrollWidth || 1),
          y: (viewport.scrollTop + viewport.clientHeight / 2) / (viewport.scrollHeight || 1),
        }
      }
      setZoomLevel((current) => Math.min(Math.max(next(current), 1), MAX_ZOOM))
    },
    [imageReady],
  )

  const zoomIn = useCallback(() => changeZoom((current) => current + ZOOM_STEP), [changeZoom])
  const zoomOut = useCallback(() => changeZoom((current) => current - ZOOM_STEP), [changeZoom])
  const resetZoom = useCallback(() => changeZoom(() => 1), [changeZoom])

  const showImage = useCallback(
    (index: number) => {
      if (index !== currentIndex) {
        moveFocusFromRetry()
        setCurrentIndex(index)
        setAttempt(0)
        setImageState({ src: slides[index].src, attempt: 0, status: 'loading' })
      }
      setZoomLevel(1)
    },
    [currentIndex, moveFocusFromRetry, slides],
  )

  const stepImage = useCallback(
    (delta: number) => {
      showImage((currentIndex + delta + total) % total)
    },
    [currentIndex, showImage, total],
  )

  // The image is sized from its fitted size, so the zoomed overflow can be scrolled to on every side.
  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollLeft = focalPoint.current.x * viewport.scrollWidth - viewport.clientWidth / 2
    viewport.scrollTop = focalPoint.current.y * viewport.scrollHeight - viewport.clientHeight / 2
  }, [zoomLevel])

  // Measures the space available to the image. The border box ignores scrollbars so zoomed
  // scrollbars do not feed back into the fitted size.
  const attachViewport = useCallback((viewport: HTMLDivElement | null) => {
    viewportRef.current = viewport
    if (!viewport) return
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(viewport)
      setViewportSize({
        width: viewport.offsetWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height: viewport.offsetHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      })
    })
    observer.observe(viewport, { box: 'border-box' })
    return () => {
      observer.disconnect()
      viewportRef.current = null
    }
  }, [])

  // Arrow keys and buttons change the image without touching the strip; keep the active
  // thumbnail in view when the strip overflows (phones with many images).
  useEffect(() => {
    thumbnailRefs.current[currentIndex]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [currentIndex])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeGallery()
        return
      }
      const panDirection = PAN_DIRECTIONS[event.key]
      if (zoomed && panDirection) {
        event.preventDefault()
        viewportRef.current?.scrollBy({ left: panDirection[0] * PAN_STEP_PX, top: panDirection[1] * PAN_STEP_PX })
      } else if (event.key === 'ArrowLeft' && total > 1) {
        stepImage(-1)
      } else if (event.key === 'ArrowRight' && total > 1) {
        stepImage(1)
      } else if (event.key === '+' || event.key === '=') {
        zoomIn()
      } else if (event.key === '-') {
        zoomOut()
      } else if (event.key === '0') {
        resetZoom()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeGallery, resetZoom, stepImage, total, zoomIn, zoomOut, zoomed])

  // Mouse drag pans the zoomed image; unzoomed horizontal touch swipes switch slides while
  // zoomed touch gestures scroll natively inside the viewport.
  const handleViewportPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    if (!viewport) return
    if (zoomed && event.pointerType === 'mouse' && event.button === 0) {
      dragStart.current = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop }
      viewport.setPointerCapture?.(event.pointerId)
      setDragging(true)
    } else if (!zoomed && event.pointerType === 'touch' && total > 1) {
      touchStart.current = { x: event.clientX, y: event.clientY }
    }
  }

  const handleViewportPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    const viewport = viewportRef.current
    if (!start || !viewport) return
    viewport.scrollLeft = start.left - (event.clientX - start.x)
    viewport.scrollTop = start.top - (event.clientY - start.y)
  }

  const handleViewportPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current) {
      dragStart.current = null
      setDragging(false)
    }
    const swipeOrigin = touchStart.current
    if (swipeOrigin && event.pointerType === 'touch' && !zoomed && total > 1) {
      const dx = event.clientX - swipeOrigin.x
      const dy = event.clientY - swipeOrigin.y
      if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * 1.4) {
        suppressClickRef.current = true
        stepImage(dx < 0 ? 1 : -1)
      }
    }
    touchStart.current = null
  }

  // Fallback for browsers without native closedby="any" when clicking the backdrop outside the dialog rect.
  const handleDialogPointerDown = (event: React.PointerEvent<HTMLDialogElement>) => {
    if (!dialogRef.current || 'closedBy' in HTMLDialogElement.prototype) return
    pressedOutsideRef.current = event.target === dialogRef.current && isOutsideRect(dialogRef.current, event)
  }

  const handleDialogPointerUp = (event: React.PointerEvent<HTMLDialogElement>) => {
    if (!dialogRef.current || 'closedBy' in HTMLDialogElement.prototype) return
    const wasPressedOutside = pressedOutsideRef.current
    pressedOutsideRef.current = false
    if (wasPressedOutside && event.target === dialogRef.current && isOutsideRect(dialogRef.current, event)) {
      closeGallery()
    }
  }

  const imageSize: React.CSSProperties = fittedSize
    ? { width: fittedSize.width * zoomLevel, height: fittedSize.height * zoomLevel }
    : { maxWidth: viewportSize?.width ?? '100%', maxHeight: viewportSize?.height ?? '100%' }

  return (
    <dialog
      ref={dialogRef}
      className="project-gallery"
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        closeGallery()
      }}
      onClose={closeGallery}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
    >
      <div className="project-gallery-header">
        <h2 id={titleId} className="project-gallery-title">
          {title}
        </h2>
        <div className="project-gallery-toolbar-actions">
          <div className="project-gallery-zoom-group">
            <button
              type="button"
              className="project-gallery-btn"
              onClick={zoomOut}
              disabled={!imageReady || !zoomed}
              aria-label={t('projects.gallery.zoomOut')}
            >
              <IconSvg>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35M8 11h6" />
              </IconSvg>
            </button>
            <button
              type="button"
              className="project-gallery-btn"
              onClick={resetZoom}
              disabled={!imageReady || !zoomed}
              aria-label={t('projects.gallery.resetZoom')}
            >
              <IconSvg>
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </IconSvg>
              <span className="project-gallery-zoom-label" aria-hidden="true">
                {Math.round(zoomLevel * 100)}%
              </span>
            </button>
            <button
              type="button"
              className="project-gallery-btn"
              onClick={zoomIn}
              disabled={!imageReady || zoomLevel >= MAX_ZOOM}
              aria-label={t('projects.gallery.zoomIn')}
            >
              <IconSvg>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
              </IconSvg>
            </button>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="project-gallery-btn"
            onClick={closeGallery}
            aria-label={t('projects.gallery.close')}
          >
            <IconSvg>
              <path d="M18 6 6 18M6 6l12 12" />
            </IconSvg>
          </button>
        </div>
      </div>

      <div className="project-gallery-stage">
        <div
          ref={attachViewport}
          role="region"
          aria-label={t('projects.gallery.viewer')}
          aria-busy={imageStatus === 'loading'}
          aria-describedby={imageStatus === 'loading' ? progressId : undefined}
          tabIndex={zoomed ? 0 : -1}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerEnd}
          onPointerCancel={handleViewportPointerEnd}
          className={`project-gallery-viewport${zoomed ? ' is-zoomed' : ''}${dragging ? ' is-dragging' : ''}`}
        >
          <img
            key={`${slide.src}:${attempt}`}
            ref={attachImage}
            src={slide.src}
            alt={slide.alt}
            draggable={false}
            onLoad={(event) => settleImage(event.currentTarget, 'loaded')}
            onError={(event) => settleImage(event.currentTarget, 'error')}
            onClick={
              !imageReady || zoomed
                ? undefined
                : () => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false
                      return
                    }
                    zoomIn()
                  }
            }
            className="project-gallery-img"
            style={{
              ...imageSize,
              position: imageReady ? undefined : 'absolute',
              visibility: imageReady ? 'visible' : 'hidden',
              cursor: !imageReady ? undefined : zoomed ? undefined : 'zoom-in',
            }}
          />
        </div>

        {!imageReady && (
          <div className="project-gallery-overlay">
            {imageStatus === 'loading' && (
              <div
                id={progressId}
                role="progressbar"
                aria-label={t('projects.gallery.loading')}
                className="project-gallery-spinner"
              />
            )}
            <p className="project-gallery-state-message">{imageStatusLabel}</p>
            {(imageStatus === 'error' || attempt > 0) && (
              <button
                ref={retryButtonRef}
                type="button"
                className="project-gallery-btn"
                onClick={() => {
                  if (imageStatus === 'error') setAttempt((current) => current + 1)
                }}
                aria-disabled={imageStatus !== 'error'}
              >
                {t('projects.gallery.retry')}
              </button>
            )}
          </div>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              className="project-gallery-btn project-gallery-nav project-gallery-nav--prev"
              onClick={() => stepImage(-1)}
              aria-label={t('projects.gallery.previousImage')}
            >
              <IconSvg>
                <path d="m15 18-6-6 6-6" />
              </IconSvg>
            </button>
            <button
              type="button"
              className="project-gallery-btn project-gallery-nav project-gallery-nav--next"
              onClick={() => stepImage(1)}
              aria-label={t('projects.gallery.nextImage')}
            >
              <IconSvg>
                <path d="m9 18 6-6-6-6" />
              </IconSvg>
            </button>
          </>
        )}
      </div>

      <div role="status" className="project-gallery-status">
        <span className="project-gallery-sr-only">{imageStatusLabel}</span>
        <p className="project-gallery-counter">{t('projects.gallery.counter', { index: currentIndex + 1, total })}</p>
        <p className="project-gallery-caption">{slide.alt}</p>
      </div>

      {total > 1 && (
        <div className="project-gallery-thumbs">
          {slides.map((thumbnail, idx) => (
            <button
              type="button"
              key={thumbnail.src}
              ref={(element) => {
                thumbnailRefs.current[idx] = element
              }}
              onClick={() => showImage(idx)}
              aria-label={t('projects.gallery.thumbnail', {
                index: idx + 1,
                total,
                title,
              })}
              aria-pressed={currentIndex === idx}
              className="project-gallery-thumb"
              style={{ backgroundImage: `url(${thumbnail.thumbSrc})` }}
            />
          ))}
        </div>
      )}
    </dialog>
  )
}

export default ProjectGallery
