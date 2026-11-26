import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { ProjectCard, getAllProjects, getFeaturedProjects } from '@/entities/project'
import { getProfile } from '@/entities/profile'
import { useLanguage } from '@/features/language-switch'
import { localizedPath } from '@/shared/config'
import { getLocalizedText, useContent, usePageMeta } from '@/shared/lib'
import {
  ArrowForwardIcon,
  DownloadIcon,
  EmailIcon,
  EmptyState,
  GitHubIcon,
  ImageWithFallback,
  LinkedInIcon,
  LocationIcon,
  RichTextRenderer,
  RocketIcon,
  StatusBadge,
} from '@/shared/ui'
import { PixelGoblin } from '@/widgets/pixel-goblin'
import './HomePage.css'

const HomePage: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()

  usePageMeta({
    title: t('seo.home.title'),
    description: t('seo.home.description'),
  })

  const { data: featuredProjects } = useContent(() => getFeaturedProjects())
  const { data: allProjects } = useContent(() => getAllProjects())
  const { data: profile } = useContent(() => getProfile())
  const [emailUser, emailDomain] = profile.email.split('@')
  const [flagshipProject, ...secondaryFeatured] = featuredProjects
  const fullName = getLocalizedText(language, profile.fullNameEn, profile.fullNameEs)
  const location = getLocalizedText(language, profile.locationEn, profile.locationEs)

  return (
    <div>
      <section className="home-hero">
        <div className="wb-container home-hero__grid">
          <div className="wb-panel home-hero__main">
            <div>
              <div className="home-hero__top">
                <p className="wb-eyebrow">{location}</p>
                <StatusBadge label={t('common.openToWork')} />
              </div>

              <h1 className="home-hero__title">{t('home.headline')}</h1>
              <p className="home-hero__identity">
                {fullName} · {getLocalizedText(language, profile.subtitleEn, profile.subtitleEs)}
              </p>

              <RichTextRenderer text={getLocalizedText(language, profile.descriptionEn, profile.descriptionEs)} />
            </div>

            <div className="home-hero__actions">
              <RouterLink to={localizedPath('/projects', language)} className="wb-btn-primary">
                <span>{t('home.cta')}</span>
                <ArrowForwardIcon />
              </RouterLink>
              <RouterLink to={localizedPath('/contact', language)} className="wb-btn-secondary">
                <EmailIcon />
                <span>{t('home.ctaContact')}</span>
              </RouterLink>
              {profile.cvUrl ? (
                <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer" className="wb-btn-secondary">
                  <DownloadIcon />
                  <span>{t('home.resume')}</span>
                </a>
              ) : null}
            </div>
          </div>

          <div className="wb-panel home-rig">
            <PixelGoblin />
            <div className="home-rig__caption" aria-hidden="true">
              {t('home.goblinCaption')}
            </div>
            <div className="home-rig__body">
              <ImageWithFallback
                src={profile.imageUrl}
                alt={fullName}
                type="profile"
                aspectRatio="4/5"
                loading="eager"
                fetchPriority="high"
                className="home-rig__photo"
              />
              <ul className="home-rig__tiles" aria-label={t('home.focusAreas')}>
                {profile.focusAreas.map((area) => (
                  <li key={area.labelEn} className="home-rig__tile">
                    <span className="home-rig__tile-k">{getLocalizedText(language, area.labelEn, area.labelEs)}</span>
                    <strong className="home-rig__tile-v">{area.technologies.join(' · ')}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="wb-container">
          <div className="home-section__head">
            <div>
              <p className="wb-eyebrow">{t('nav.projects')}</p>
              <h2 className="home-section__title">{t('projects.featured')}</h2>
              <p className="home-section__lead">
                {t('home.featuredLead', { view: t('projects.viewTab'), architecture: t('projects.archTab') })}
              </p>
            </div>
            <RouterLink to={localizedPath('/projects', language)} className="wb-btn-secondary">
              <span>{t('home.viewAllCount', { count: allProjects.length })}</span>
              <ArrowForwardIcon />
            </RouterLink>
          </div>

          {featuredProjects.length > 0 ? (
            <div className="home-featured">
              {flagshipProject ? (
                <ProjectCard project={flagshipProject} titleComponent="h3" variant="flagship" />
              ) : null}
              {secondaryFeatured.length > 0 ? (
                <div className="home-featured__pair">
                  {secondaryFeatured.map((project) => (
                    <ProjectCard key={project.id} project={project} titleComponent="h3" />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title={t('emptyState.featured.title')}
              description={t('emptyState.featured.description')}
              icon={<RocketIcon />}
            />
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="wb-container home-lower-grid">
          <article className="wb-panel home-lower-card">
            <p className="wb-eyebrow">{t('nav.about')}</p>
            <h2 className="home-lower-card__title">{t('home.aboutTitle')}</h2>
            <RichTextRenderer
              text={getLocalizedText(language, profile.aboutSummaryEn, profile.aboutSummaryEs)}
              variant="body2"
            />
            <div className="home-lower-card__actions">
              <RouterLink to={localizedPath('/about', language)} className="wb-btn-secondary">
                <span>{t('about.more')}</span>
                <ArrowForwardIcon />
              </RouterLink>
            </div>
          </article>

          <article className="wb-panel home-lower-card">
            <p className="wb-eyebrow">{t('home.contactEyebrow')}</p>
            <h2 className="home-lower-card__title">{t('contact.heading')}</h2>
            <p className="home-lower-card__lead">{t('home.contactLead')}</p>
            <div className="home-contact-meta">
              <a href={`mailto:${profile.email}`} className="home-contact-meta__link">
                {emailUser}@<wbr />
                {emailDomain}
              </a>
              <p className="home-contact-meta__loc">
                <LocationIcon />
                <span>{location}</span>
              </p>
            </div>
            <div className="home-lower-card__actions">
              <RouterLink to={localizedPath('/contact', language)} className="wb-btn-primary">
                <EmailIcon />
                <span>{t('home.contactCta')}</span>
              </RouterLink>
              {profile.githubUrl ? (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="wb-btn-secondary">
                  <GitHubIcon />
                  <span>GitHub</span>
                </a>
              ) : null}
              {profile.linkedinUrl ? (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="wb-btn-secondary">
                  <LinkedInIcon />
                  <span>LinkedIn</span>
                </a>
              ) : null}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

export default HomePage
