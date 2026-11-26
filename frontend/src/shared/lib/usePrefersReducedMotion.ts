import { useEffect, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const currentlyReduced = (): boolean =>
  typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY).matches : false

export const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(currentlyReduced)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const sync = () => setReduced(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return reduced
}
