import React from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/features/language-switch'
import { getCoreSkillGroups } from '@/entities/skill'
import { getAllSpokenLanguages } from '@/entities/spoken-language'
import { getProfile } from '@/entities/profile'
import { getLocalizedText, useContent, usePageMeta } from '@/shared/lib'
import { DownloadIcon, ImageWithFallback, RichTextRenderer } from '@/shared/ui'
import './AboutPage.css'

const AboutPage: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()

  usePageMeta({
    title: t('seo.about.title'),
    description: t('seo.about.description'),
  })

  const { data: competencyGroups } = useContent(() => getCoreSkillGroups())
  const { data: spokenLanguages } = useContent(() => getAllSpokenLanguages())
  const { data: profile } = useContent(() => getProfile())

  return (
    <div className="wb-page wb-container">
      <div className="wb-page-header">
        <p className="wb-eyebrow">{t('nav.about')}</p>
        <h1 className="wb-page-title">{getLocalizedText(language, profile.aboutTitleEn, profile.aboutTitleEs)}</h1>
      </div>

      <div className="about-grid">
        <aside className="wb-panel about-media">
          {/* Above the fold and this page's LCP element: preloaded by routes.ts route shell. */}
          <ImageWithFallback
            src={profile.imageUrl}
            alt={getLocalizedText(language, profile.fullNameEn, profile.fullNameEs)}
            type="profile"
            aspectRatio="2/3"
            loading="eager"
            fetchPriority="high"
            className="about-media__photo"
          />
          {profile.cvUrl ? (
            <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer" className="wb-btn-primary">
              <DownloadIcon />
              <span>{t('home.resume')}</span>
            </a>
          ) : null}
        </aside>

        <div className="about-body">
          <h2 className="about-body__intro">
            {getLocalizedText(language, profile.aboutIntroTitleEn, profile.aboutIntroTitleEs)}
          </h2>

          <RichTextRenderer text={getLocalizedText(language, profile.aboutSummaryEn, profile.aboutSummaryEs)} />

          <RichTextRenderer text={getLocalizedText(language, profile.aboutPhilosophyEn, profile.aboutPhilosophyEs)} />

          <figure className="wb-panel about-quote">
            <figcaption className="about-quote__title">{t('about.sentenceTitle')}</figcaption>
            <blockquote className="about-quote__text">
              <p>“{getLocalizedText(language, profile.sentenceEn, profile.sentenceEs)}”</p>
            </blockquote>
          </figure>

          {competencyGroups.length > 0 ? (
            <section className="about-chips-section">
              <h2 className="about-chips-section__title">{t('about.skills')}</h2>
              <dl className="about-competencies">
                {competencyGroups.map((group) => (
                  <div key={group.category} className="about-competencies__group">
                    <dt className="about-competencies__category">{t(`skills.categories.${group.category}`)}</dt>
                    <dd className="about-chips-list">
                      {group.skills.map((skill) => (
                        <span key={skill.id} className="wb-chip">
                          {getLocalizedText(language, skill.nameEn, skill.nameEs)}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {spokenLanguages.length > 0 ? (
            <section className="about-chips-section">
              <h2 className="about-chips-section__title">{t('about.languages')}</h2>
              <div className="about-chips-list">
                {spokenLanguages.map((lang) => (
                  <span key={lang.id} className="wb-chip">
                    {getLocalizedText(language, lang.nameEn, lang.nameEs)} (
                    {getLocalizedText(language, lang.levelEn, lang.levelEs)})
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default AboutPage
