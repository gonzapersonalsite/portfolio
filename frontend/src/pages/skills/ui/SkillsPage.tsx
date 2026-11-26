import React from 'react'
import { useTranslation } from 'react-i18next'
import { getSkillGroups } from '@/entities/skill'
import { useLanguage } from '@/features/language-switch'
import { getLocalizedText, useContent, usePageMeta } from '@/shared/lib'
import { EmptyState, LayersIcon } from '@/shared/ui'
import './SkillsPage.css'

const SkillsPage: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()

  usePageMeta({
    title: t('seo.skills.title'),
    description: t('seo.skills.description'),
  })

  const { data: skillGroups } = useContent(() => getSkillGroups())

  return (
    <div className="wb-page wb-container">
      <div className="wb-page-header">
        <p className="wb-eyebrow">{t('nav.skills')}</p>
        <h1 className="wb-page-title">{t('skills.heading')}</h1>
        <p className="wb-page-lead">{t('skills.lead')}</p>
      </div>

      {skillGroups.length > 0 ? (
        <div className="skills-grid">
          {skillGroups.map(({ category, skills }) => (
            <section key={category} className="wb-panel skills-group">
              <h2 className="skills-group__title">{t(`skills.categories.${category}`)}</h2>
              <dl className="skills-group__list">
                {skills.map((skill) => (
                  <div key={skill.id} className="skill-item">
                    <dt className="skill-item__name">{getLocalizedText(language, skill.nameEn, skill.nameEs)}</dt>
                    <dd className="skill-item__applied">
                      {getLocalizedText(language, skill.appliedEn, skill.appliedEs)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t('emptyState.skills.title')}
          description={t('emptyState.skills.description')}
          icon={<LayersIcon />}
        />
      )}
    </div>
  )
}

export default SkillsPage
