import { useLayoutEffect, useRef, useState } from 'react'

// Show/hide state for a "Read more" region that stays searchable while collapsed:
// hidden="until-found" lets find-in-page match the hidden text, and the browser's
// beforematch event expands the region before revealing the match. Browsers without
// support treat the attribute like plain `hidden`, so the toggle still works there.
// React types `hidden` as a boolean, so the attribute is managed on the element directly.
export function useFindableDisclosure<T extends HTMLElement>() {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<T>(null)

  useLayoutEffect(() => {
    const element = contentRef.current
    if (!element) return

    if (expanded) {
      element.removeAttribute('hidden')
      return
    }

    element.setAttribute('hidden', 'until-found')
    const reveal = () => setExpanded(true)
    element.addEventListener('beforematch', reveal)
    return () => element.removeEventListener('beforematch', reveal)
  }, [expanded])

  const toggle = () => setExpanded((current) => !current)

  return { expanded, toggle, contentRef }
}
