import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { lazy, Suspense } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, within } from '@testing-library/react'
import { HeroSkeleton } from '../../src/shared/ui/SkeletonLoaders'

const template = readFileSync(resolve(import.meta.dirname, '../../index.html'), 'utf8')

const mountStartup = (): HTMLElement => {
  const html = new DOMParser().parseFromString(template, 'text/html')
  const root = html.getElementById('root')!
  document.body.append(root)
  return root
}

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
})

describe('initial HTML loading state', () => {
  it('offers a named indeterminate indicator without running any app code', () => {
    const root = mountStartup()
    const progress = within(root).getByRole('progressbar', { name: 'Loading portfolio' })

    expect(progress.hasAttribute('value')).toBe(false)
    expect(root.textContent?.trim()).toBe('GONZALO.DEV')
  })

  it('hands over to the existing React skeleton while the page module is still pending', () => {
    const root = mountStartup()
    const PendingPage = lazy(() => new Promise<{ default: () => null }>(() => {}))

    render(
      <Suspense fallback={<HeroSkeleton />}>
        <PendingPage />
      </Suspense>,
      { container: root },
    )

    expect(root.querySelector('.app-startup')).toBeNull()
    expect(root.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
  })
})
