import React, { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toSupportedLanguage } from '@/shared/config'
import { getLocalizedText, useFindableDisclosure } from '@/shared/lib'
import {
  BookIcon,
  CodeIcon,
  DesktopIcon,
  DownloadIcon,
  EyeIcon,
  GalleryIcon,
  GitHubIcon,
  GlobeIcon,
  ImageWithFallback,
  LaunchIcon,
  PhoneIcon,
  RichTextRenderer,
  StarIcon,
  StoreIcon,
} from '@/shared/ui'
import { PROJECT_LINK_KINDS, isPrimaryLink, type ProjectLinkKind } from '../model/projectLinks'
import { PROJECT_COVER_RATIO, projectCoverSources, projectImageUrl } from '../model/projectImages'
import type { Project } from '../model/types'
import { splitDescription } from '../lib/splitDescription'
import ProjectGallery, { type GallerySlide } from './ProjectGallery'
import './ProjectCard.css'

const LINK_ICONS: Record<ProjectLinkKind, React.ReactElement> = {
  site: <LaunchIcon />,
  download: <DownloadIcon />,
  googlePlay: <StoreIcon />,
  microsoftStore: <StoreIcon />,
  repository: <GitHubIcon />,
  documentation: <BookIcon />,
}

const TYPE_ICONS: Record<Project['type'], React.ReactElement> = {
  WEB: <GlobeIcon />,
  DESKTOP: <DesktopIcon />,
  MOBILE: <PhoneIcon />,
  OTHER: <CodeIcon />,
}

export interface ProjectCardProps {
  readonly project: Project
  readonly priority?: boolean
  readonly eager?: boolean
  readonly titleComponent?: 'h2' | 'h3'
  readonly variant?: 'default' | 'flagship'
}

type CardStageView = 'view' | 'architecture'

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  priority = false,
  eager = priority,
  titleComponent = 'h2',
  variant = 'default',
}) => {
  const { t, i18n } = useTranslation()
  const language = toSupportedLanguage(i18n.language) ?? 'es'
  const { expanded, toggle, contentRef } = useFindableDisclosure<HTMLDivElement>()
  const [stageView, setStageView] = useState<CardStageView>('view')
  const [galleryOpen, setGalleryOpen] = useState(false)
  const titleId = useId()

  const title = getLocalizedText(language, project.titleEn, project.titleEs)
  const description = getLocalizedText(language, project.descriptionEn, project.descriptionEs)
  const { lead, rest } = splitDescription(description)
  const architectureSpecs = language === 'en' ? project.architectureEn : project.architectureEs
  const cover = project.images[0]
  const coverSources = cover ? projectCoverSources(project) : { src: undefined, srcSet: undefined, sizes: undefined }
  const coverAlt = cover ? getLocalizedText(language, cover.altEn, cover.altEs) : title
  const orderIndex = String(project.order).padStart(2, '0')
  const HeadingTag = titleComponent

  const slides: GallerySlide[] = useMemo(
    () =>
      project.images.map((image) => ({
        src: projectImageUrl(image, 'full'),
        thumbSrc: projectImageUrl(image, 'thumb'),
        alt: getLocalizedText(language, image.altEn, image.altEs),
      })),
    [project.images, language],
  )

  const openGallery = () => {
    if (slides.length === 0) return
    setGalleryOpen(true)
  }

  return (
    <article
      aria-labelledby={titleId}
      className={variant === 'flagship' ? 'project-card wb-panel project-card--flagship' : 'project-card wb-panel'}
    >
      <div className="project-card__top">
        <div className="project-card__badges">
          <span className="project-card__index">{orderIndex}</span>
          <span className="project-card__type-chip">
            {TYPE_ICONS[project.type]}
            <span>{t(`projects.types.${project.type}`)}</span>
          </span>
          {project.featured ? (
            <span className="project-card__featured-chip">
              <StarIcon />
              <span>{t('projects.featuredBadge')}</span>
            </span>
          ) : null}
        </div>

        <div className="project-card__view-switch wb-no-print" role="group" aria-label={t('projects.viewModeLabel')}>
          <button
            type="button"
            className="project-card__view-btn"
            aria-pressed={stageView === 'view'}
            onClick={() => setStageView('view')}
          >
            {t('projects.viewTab')}
          </button>
          <button
            type="button"
            className="project-card__view-btn"
            aria-pressed={stageView === 'architecture'}
            onClick={() => setStageView('architecture')}
          >
            {t('projects.archTab')}
          </button>
        </div>
      </div>

      <div className="project-card__body">
        <div className="project-card__reading">
          <HeadingTag id={titleId} className="project-card__title">
            {title}
          </HeadingTag>

          <RichTextRenderer text={lead} variant="body2" />

          {rest ? (
            <>
              <div ref={contentRef} className="project-card__disclosure">
                <RichTextRenderer text={rest} variant="body2" />
              </div>
              <button
                type="button"
                className="project-card__read-more wb-no-print"
                aria-expanded={expanded}
                onClick={toggle}
              >
                {expanded ? t('projects.showLess') : t('projects.readMore')}
              </button>
            </>
          ) : null}
        </div>

        <div className="project-card__stage">
          {stageView === 'view' ? (
            <button
              type="button"
              className="project-card__cover-btn"
              aria-label={t('projects.openGallery', { title })}
              aria-describedby={titleId}
              onClick={openGallery}
            >
              <ImageWithFallback
                src={coverSources.src}
                srcSet={coverSources.srcSet}
                sizes={coverSources.sizes}
                alt={coverAlt}
                type="project"
                aspectRatio={`${PROJECT_COVER_RATIO.width}/${PROJECT_COVER_RATIO.height}`}
                loading={eager ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : undefined}
                imageClassName="project-card__cover-img"
              />
              <div className="preview-overlay" aria-hidden="true">
                <span className="project-card__preview-pill">
                  <EyeIcon />
                </span>
              </div>
              {project.images.length > 0 ? (
                <span className="project-card__gallery-badge wb-no-print" aria-hidden="true">
                  <GalleryIcon className="project-card__gallery-icon" />
                  <span>{project.images.length}</span>
                </span>
              ) : null}
            </button>
          ) : (
            <div className="project-card__specs">
              <p className="project-card__specs-title">{t('projects.specsTitle')}</p>
              <dl className="project-card__specs-list">
                {architectureSpecs.map((spec) => (
                  <div key={spec.label} className="project-card__spec-item">
                    <dt>{spec.label}</dt>
                    <dd>{spec.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="project-card__footer">
        <div className="project-card__tags">
          {project.technologies.map((tech) => (
            <span key={tech} className="wb-chip">
              {tech}
            </span>
          ))}
        </div>

        <div className="project-card__actions">
          {project.links.map((link) => (
            <a
              key={link.kind}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby={titleId}
              className={`${isPrimaryLink(link) ? 'wb-btn-primary' : 'wb-btn-secondary'} project-card__action-btn`}
            >
              {LINK_ICONS[link.kind]}
              <span>{t(PROJECT_LINK_KINDS[link.kind].labelKey)}</span>
            </a>
          ))}
          {slides.length > 0 && stageView === 'architecture' ? (
            <button type="button" className="wb-btn-secondary project-card__action-btn" onClick={openGallery}>
              <GalleryIcon />
              <span>{t('projects.openGalleryCta', { count: slides.length })}</span>
            </button>
          ) : null}
        </div>
      </div>

      {galleryOpen ? <ProjectGallery title={title} slides={slides} onClose={() => setGalleryOpen(false)} /> : null}
    </article>
  )
}

export default ProjectCard
