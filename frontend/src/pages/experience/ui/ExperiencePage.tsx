import React from 'react'
import { useTranslation } from 'react-i18next'
import { getAllExperiences } from '@/entities/experience'
import { useLanguage } from '@/features/language-switch'
import { formatPeriod, getLocalizedText, useContent, usePageMeta } from '@/shared/lib'
import { CalendarIcon, EmptyState, ExploreIcon, RichTextRenderer, StatusBadge } from '@/shared/ui'
import './ExperiencePage.css'

const ExperiencePage: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()

  usePageMeta({
    title: t('seo.experience.title'),
    description: t('seo.experience.description'),
  })

  const { data: experiences } = useContent(() => getAllExperiences())

  return (
    <div className="wb-page wb-container">
      <div className="wb-page-header">
        <p className="wb-eyebrow">{t('nav.experience')}</p>
        <h1 className="wb-page-title">{t('experience.heading')}</h1>
        <p className="wb-page-lead">{t('experience.lead')}</p>
      </div>

      <div className="experience-badge">
        <StatusBadge label={t('common.openToWork')} />
      </div>

      {experiences.length > 0 ? (
        <ol className="experience-list">
          {experiences.map((exp) => {
            const period = formatPeriod(exp.startDate, exp.endDate, language, t('common.present'))
            return (
              <li key={exp.id}>
                <article className="wb-panel exp-card">
                  <div className="exp-card__meta">
                    <span className="exp-card__period">
                      <CalendarIcon />
                      <span>{period}</span>
                    </span>
                    <p className="exp-card__company">{getLocalizedText(language, exp.companyEn, exp.companyEs)}</p>
                  </div>

                  <div className="exp-card__main">
                    <h2 className="exp-card__role">{getLocalizedText(language, exp.positionEn, exp.positionEs)}</h2>

                    <RichTextRenderer text={getLocalizedText(language, exp.descriptionEn, exp.descriptionEs)} />

                    <div className="exp-card__tags">
                      {exp.technologies.map((tech) => (
                        <span key={tech} className="wb-chip">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ol>
      ) : (
        <EmptyState
          title={t('emptyState.experience.title')}
          description={t('emptyState.experience.description')}
          icon={<ExploreIcon />}
        />
      )}
    </div>
  )
}

export default ExperiencePage
