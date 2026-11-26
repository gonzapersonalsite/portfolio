import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProjectCard, getAllProjects, type Project } from '@/entities/project'
import { useContent, usePageMeta } from '@/shared/lib'
import { EmptyState, RocketIcon } from '@/shared/ui'
import './ProjectsPage.css'

type PlatformFilter = 'ALL' | Project['type']

// Position of each platform among the filters. A Record, so a new project type cannot be left without one.
const PLATFORM_RANK: Record<Project['type'], number> = { MOBILE: 0, DESKTOP: 1, WEB: 2, OTHER: 3 }

interface FilterOption {
  value: PlatformFilter
  label: string
  count: number
}

const ProjectsPage: React.FC = () => {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<PlatformFilter>('ALL')

  usePageMeta({
    title: t('seo.projects.title'),
    description: t('seo.projects.description'),
  })

  const { data: projects } = useContent(() => getAllProjects())

  const filterOptions = useMemo((): FilterOption[] => {
    const counts = new Map<Project['type'], number>()
    for (const project of projects) {
      counts.set(project.type, (counts.get(project.type) ?? 0) + 1)
    }
    const platformEntries = [...counts.entries()]
      .sort(([first], [second]) => PLATFORM_RANK[first] - PLATFORM_RANK[second])
      .map(([type, count]): FilterOption => ({ value: type, label: t(`projects.types.${type}`), count }))
    return [{ value: 'ALL', label: t('projects.filterAll'), count: projects.length }, ...platformEntries]
  }, [projects, t])

  const visibleProjects = useMemo(
    () => (filter === 'ALL' ? projects : projects.filter((project) => project.type === filter)),
    [filter, projects],
  )

  return (
    <div className="wb-page wb-container">
      <div className="wb-page-header">
        <p className="wb-eyebrow">{t('nav.projects')}</p>
        <h1 className="wb-page-title">{t('projects.heading')}</h1>
        <p className="wb-page-lead">{t('projects.lead', { architecture: t('projects.archTab') })}</p>
      </div>

      {projects.length > 0 ? (
        <>
          <div className="projects-filters wb-no-print" role="group" aria-label={t('projects.filterLabel')}>
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="projects-filter-btn"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
              >
                <span>{option.label}</span>
                <span>({option.count})</span>
              </button>
            ))}
          </div>

          <ul className="projects-grid">
            {visibleProjects.map((project, index) => {
              const isFlagship = index === 0 && visibleProjects.length > 1
              return (
                <li
                  key={project.id}
                  className={isFlagship ? 'projects-grid__item projects-grid__item--wide' : 'projects-grid__item'}
                >
                  {/* First cover is preloaded with high priority matching routes.ts lcpImage. */}
                  <ProjectCard
                    project={project}
                    priority={index === 0 && filter === 'ALL'}
                    eager={index < 3}
                    titleComponent="h2"
                    variant={isFlagship ? 'flagship' : 'default'}
                  />
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <EmptyState
          title={t('emptyState.projects.title')}
          description={t('emptyState.projects.description')}
          icon={<RocketIcon />}
        />
      )}
    </div>
  )
}

export default ProjectsPage
