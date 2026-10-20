import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { findAppRoute } from '@/shared/config'

// A client-side navigation keeps the scroll position and leaves the focus on the link that was
// activated (or on <body> when that link unmounts), so the new page would open half-way down
// and screen readers would not notice it. Each new page starts at the top with the focus on
// `targetId` (the <main> region). Back/forward (POP), hash-only changes and language switches
// on the same page (`/about` <-> `/en/about`) keep the current position and focus.
export function useRouteChangeFocus(targetId: string) {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const routeKey = findAppRoute(pathname)?.path ?? pathname
  const previousRouteKey = useRef(routeKey)

  useEffect(() => {
    if (previousRouteKey.current === routeKey) return
    previousRouteKey.current = routeKey
    if (navigationType === 'POP') return

    window.scrollTo(0, 0)
    document.getElementById(targetId)?.focus({ preventScroll: true })
  }, [routeKey, navigationType, targetId])
}
