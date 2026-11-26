import React from 'react'
import './SkeletonLoaders.css'

// Each skeleton mirrors the layout of the page it stands in for, so the page replaces it
// without moving what the reader is already looking at. They only use their own CSS and
// the global layout classes: the page stylesheets are not loaded yet while they show.

const Skeleton: React.FC<{ readonly className: string }> = ({ className }) => (
  <div className={`ui-skeleton ${className}`} />
)

const Lines: React.FC<{ readonly count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <Skeleton key={index} className={index === count - 1 ? 'ui-skeleton--short-line' : 'ui-skeleton--line'} />
    ))}
  </>
)

const PageSkeleton: React.FC<{ readonly leadLines: number; readonly children: React.ReactNode }> = ({
  leadLines,
  children,
}) => (
  <div className="wb-page wb-container" aria-hidden="true">
    <div className="ui-skeleton-header">
      <Skeleton className="ui-skeleton--eyebrow" />
      <Skeleton className="ui-skeleton--title" />
      {leadLines > 0 ? (
        <div className="ui-skeleton-lead">
          <Lines count={leadLines} />
        </div>
      ) : null}
    </div>
    {children}
  </div>
)

const ProjectCardSkeleton: React.FC<{ readonly layout: 'stacked' | 'split' }> = ({ layout }) => (
  <div className="wb-panel ui-skeleton-card">
    <div className="ui-skeleton-row ui-skeleton-row--spread">
      <div className="ui-skeleton-row">
        <Skeleton className="ui-skeleton--chip" />
        <Skeleton className="ui-skeleton--chip" />
      </div>
      <Skeleton className="ui-skeleton--switch" />
    </div>
    <div className={`ui-skeleton-card__body ui-skeleton-card__body--${layout}`}>
      <div className="ui-skeleton-stack">
        <Skeleton className="ui-skeleton--subtitle" />
        <Lines count={3} />
      </div>
      <Skeleton className="ui-skeleton--card-media" />
    </div>
    <div className="ui-skeleton-row">
      <Skeleton className="ui-skeleton--chip" />
      <Skeleton className="ui-skeleton--chip" />
      <Skeleton className="ui-skeleton--chip" />
    </div>
    <div className="ui-skeleton-row">
      <Skeleton className="ui-skeleton--btn" />
      <Skeleton className="ui-skeleton--btn" />
    </div>
  </div>
)

export const HomeSkeleton: React.FC = () => (
  <div aria-hidden="true">
    <div className="wb-container ui-skeleton-section ui-skeleton-hero">
      <div className="wb-panel ui-skeleton-hero__main">
        <div className="ui-skeleton-row ui-skeleton-row--spread">
          <Skeleton className="ui-skeleton--eyebrow" />
          <Skeleton className="ui-skeleton--badge" />
        </div>
        <Skeleton className="ui-skeleton--title" />
        <Skeleton className="ui-skeleton--title" />
        <Skeleton className="ui-skeleton--title ui-skeleton--title-short" />
        <Skeleton className="ui-skeleton--subtitle" />
        <Lines count={2} />
        <div className="ui-skeleton-row">
          <Skeleton className="ui-skeleton--btn" />
          <Skeleton className="ui-skeleton--btn" />
          <Skeleton className="ui-skeleton--btn" />
        </div>
      </div>
      <div className="wb-panel ui-skeleton-rig">
        <Skeleton className="ui-skeleton--bay" />
        <div className="ui-skeleton-rig__body">
          <Skeleton className="ui-skeleton--rig-photo" />
          <div className="ui-skeleton-stack">
            {[1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="ui-skeleton--tile" />
            ))}
          </div>
        </div>
      </div>
    </div>
    <div className="wb-container ui-skeleton-section">
      <div className="ui-skeleton-header">
        <Skeleton className="ui-skeleton--eyebrow" />
        <Skeleton className="ui-skeleton--subtitle" />
        <div className="ui-skeleton-lead">
          <Lines count={1} />
        </div>
      </div>
      <ProjectCardSkeleton layout="split" />
    </div>
  </div>
)

export const AboutSkeleton: React.FC = () => (
  <PageSkeleton leadLines={0}>
    <div className="ui-skeleton-about">
      <div className="wb-panel ui-skeleton-about__media">
        <Skeleton className="ui-skeleton--portrait" />
        <Skeleton className="ui-skeleton--btn" />
      </div>
      <div className="ui-skeleton-stack">
        <Skeleton className="ui-skeleton--subtitle" />
        <Lines count={5} />
        <Lines count={3} />
        <Skeleton className="ui-skeleton--quote" />
      </div>
    </div>
  </PageSkeleton>
)

export const SkillsSkeleton: React.FC = () => (
  <PageSkeleton leadLines={1}>
    <div className="ui-skeleton-skills">
      {[6, 5, 3, 2].map((items, index) => (
        <div key={index} className="wb-panel ui-skeleton-card">
          <Skeleton className="ui-skeleton--subtitle" />
          {Array.from({ length: items }, (_, item) => (
            <div key={item} className="ui-skeleton-stack ui-skeleton-stack--tight">
              <Skeleton className="ui-skeleton--name" />
              <Skeleton className="ui-skeleton--line" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </PageSkeleton>
)

export const ExperienceSkeleton: React.FC = () => (
  <PageSkeleton leadLines={1}>
    <Skeleton className="ui-skeleton--badge ui-skeleton--spaced" />
    <div className="ui-skeleton-stack ui-skeleton-stack--loose">
      {[1, 2].map((index) => (
        <div key={index} className="wb-panel ui-skeleton-exp">
          <div className="ui-skeleton-stack">
            <Skeleton className="ui-skeleton--chip" />
            <Skeleton className="ui-skeleton--name" />
          </div>
          <div className="ui-skeleton-stack">
            <Skeleton className="ui-skeleton--subtitle" />
            <Lines count={4} />
            <div className="ui-skeleton-row">
              <Skeleton className="ui-skeleton--chip" />
              <Skeleton className="ui-skeleton--chip" />
              <Skeleton className="ui-skeleton--chip" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </PageSkeleton>
)

export const ProjectsSkeleton: React.FC = () => (
  <PageSkeleton leadLines={2}>
    <div className="ui-skeleton-row ui-skeleton--spaced">
      {[1, 2, 3, 4].map((index) => (
        <Skeleton key={index} className="ui-skeleton--filter" />
      ))}
    </div>
    <div className="ui-skeleton-stack ui-skeleton-stack--loose">
      <ProjectCardSkeleton layout="split" />
      <div className="ui-skeleton-grid-2">
        <ProjectCardSkeleton layout="stacked" />
        <ProjectCardSkeleton layout="stacked" />
      </div>
    </div>
  </PageSkeleton>
)

export const ContactSkeleton: React.FC = () => (
  <PageSkeleton leadLines={0}>
    <div className="ui-skeleton-contact">
      <div className="ui-skeleton-stack ui-skeleton-stack--loose">
        <div className="ui-skeleton-stack">
          <Skeleton className="ui-skeleton--subtitle" />
          <Lines count={2} />
        </div>
        <Skeleton className="ui-skeleton--channel" />
        <Skeleton className="ui-skeleton--channel" />
        <div className="ui-skeleton-row">
          <Skeleton className="ui-skeleton--btn" />
          <Skeleton className="ui-skeleton--btn" />
        </div>
      </div>
      <div className="wb-panel ui-skeleton-rig">
        <Skeleton className="ui-skeleton--bay" />
        <div className="ui-skeleton-card">
          {[1, 2].map((index) => (
            <div key={index} className="ui-skeleton-stack ui-skeleton-stack--tight">
              <Skeleton className="ui-skeleton--name" />
              <Skeleton className="ui-skeleton--input" />
            </div>
          ))}
          <div className="ui-skeleton-stack ui-skeleton-stack--tight">
            <Skeleton className="ui-skeleton--name" />
            <Skeleton className="ui-skeleton--textarea" />
          </div>
          <Skeleton className="ui-skeleton--btn" />
        </div>
      </div>
    </div>
  </PageSkeleton>
)

export const NotFoundSkeleton: React.FC = () => (
  <div className="wb-container ui-skeleton-section ui-skeleton-not-found" aria-hidden="true">
    <Skeleton className="ui-skeleton--chip ui-skeleton--wide-chip" />
    <Skeleton className="ui-skeleton--code" />
    <Skeleton className="ui-skeleton--title" />
    <Skeleton className="ui-skeleton--short-line" />
    <div className="wb-panel ui-skeleton-rig ui-skeleton-terminal">
      <Skeleton className="ui-skeleton--bay" />
      <div className="ui-skeleton-card">
        <Skeleton className="ui-skeleton--name" />
        <Skeleton className="ui-skeleton--terminal" />
      </div>
    </div>
  </div>
)
