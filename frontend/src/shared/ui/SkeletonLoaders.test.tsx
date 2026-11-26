import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import {
  AboutSkeleton,
  ContactSkeleton,
  ExperienceSkeleton,
  HomeSkeleton,
  NotFoundSkeleton,
  ProjectsSkeleton,
  SkillsSkeleton,
} from './SkeletonLoaders'

const SKELETONS: ReadonlyArray<readonly [string, React.FC]> = [
  ['Home', HomeSkeleton],
  ['About', AboutSkeleton],
  ['Skills', SkillsSkeleton],
  ['Experience', ExperienceSkeleton],
  ['Projects', ProjectsSkeleton],
  ['Contact', ContactSkeleton],
  ['NotFound', NotFoundSkeleton],
]

describe('page skeletons', () => {
  it.each(SKELETONS)('%s hides its placeholder shapes from assistive technology', (_name, Skeleton) => {
    const { container } = render(<Skeleton />)

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('.ui-skeleton').length).toBeGreaterThan(0)
  })

  it.each([
    ['About', AboutSkeleton, 0],
    ['Skills', SkillsSkeleton, 1],
    ['Experience', ExperienceSkeleton, 1],
    ['Projects', ProjectsSkeleton, 2],
    ['Contact', ContactSkeleton, 0],
  ] as const)('%s reserves the lead lines its page header has (%i)', (_name, Skeleton, leadLines) => {
    const { container } = render(<Skeleton />)

    expect(container.querySelectorAll('.ui-skeleton-header .ui-skeleton-lead .ui-skeleton')).toHaveLength(leadLines)
  })

  it('reserves the featured projects section below the Home hero', () => {
    const { container } = render(<HomeSkeleton />)

    expect(container.querySelector('.ui-skeleton-hero')).not.toBeNull()
    expect(container.querySelector('.ui-skeleton-card__body--split')).not.toBeNull()
  })
})
