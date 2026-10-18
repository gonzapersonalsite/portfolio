import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// A client-side navigation keeps the scroll position and leaves the focus on the link that was
// activated (or on <body> when that link unmounts), so the new page would open half-way down
// and screen readers would not notice it. Each new page starts at the top with the focus on
// `targetId` (the <main> region). Back/forward (POP) keep the browser's scroll restoration.
export function useRouteChangeFocus(targetId: string) {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    // The first render and hash-only changes (skip link, return to top) keep the pathname.
    if (previousPathname.current === pathname) return
    previousPathname.current = pathname
    if (navigationType === 'POP') return

    window.scrollTo(0, 0)
    document.getElementById(targetId)?.focus({ preventScroll: true })
  }, [pathname, navigationType, targetId])
}
