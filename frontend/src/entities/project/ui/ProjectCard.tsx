import React, { useId, useState } from 'react'
import { Box, Card, CardContent, Typography, Button, Chip, Stack, CardActions, Tooltip } from '@mui/material'
import type { ButtonProps } from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'
import LaunchIcon from '@mui/icons-material/Launch'
import DownloadIcon from '@mui/icons-material/Download'
import ShopIcon from '@mui/icons-material/Shop'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import StarIcon from '@mui/icons-material/Star'
import LanguageIcon from '@mui/icons-material/Language'
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import CodeIcon from '@mui/icons-material/Code'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import type { Project, ProjectImage } from '../model/types'
import { PROJECT_LINK_KINDS, type ProjectLinkEmphasis, type ProjectLinkKind } from '../model/projectLinks'
import { PROJECT_COVER_RATIO, projectCoverSources, projectImageUrl } from '../model/projectImages'
import { splitDescription } from '../lib/splitDescription'
import { useTranslation } from 'react-i18next'
import { getLocalizedText, useFindableDisclosure } from '@/shared/lib'
import { ImageWithFallback, RichTextRenderer } from '@/shared/ui'
import ProjectGallery from './ProjectGallery'

const TYPE_ICONS: Record<Project['type'], React.ReactElement> = {
  WEB: <LanguageIcon fontSize="small" />,
  DESKTOP: <DesktopWindowsIcon fontSize="small" />,
  MOBILE: <SmartphoneIcon fontSize="small" />,
  OTHER: <CodeIcon fontSize="small" />,
}

// Label and emphasis come from PROJECT_LINK_KINDS; only the icon is a UI concern.
const LINK_ICONS: Record<ProjectLinkKind, React.ReactElement> = {
  site: <LaunchIcon />,
  download: <DownloadIcon />,
  googlePlay: <ShopIcon />,
  repository: <GitHubIcon />,
  documentation: <MenuBookIcon />,
}

const LINK_EMPHASIS_PROPS: Record<ProjectLinkEmphasis, Pick<ButtonProps, 'variant' | 'sx'>> = {
  primary: { variant: 'contained', sx: { fontWeight: 600, px: 2 } },
  secondary: { variant: 'text', sx: { fontWeight: 600 } },
}

interface ProjectCardProps {
  project: Project
  // The first card of a page whose cover is the likely LCP element.
  priority?: boolean
  // h3 under a section heading (Home); h2 when the cards sit right under the page h1 (Projects).
  titleComponent?: 'h2' | 'h3'
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, priority = false, titleComponent = 'h3' }) => {
  // The language i18n resolved (only 'en' or 'es'), the same one the pages read from the context.
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [galleryOpen, setGalleryOpen] = useState(false)
  const { expanded, toggle, contentRef } = useFindableDisclosure<HTMLDivElement>()
  const titleId = useId()
  const moreId = useId()

  const title = getLocalizedText(language, project.titleEn, project.titleEs)
  const { lead, rest } = splitDescription(getLocalizedText(language, project.descriptionEn, project.descriptionEs))
  const altOf = (image: ProjectImage) => getLocalizedText(language, image.altEn, image.altEs)
  const cover = projectCoverSources(project)
  const featuredLabel = t('projects.featuredBadge')

  return (
    <Card
      component="article"
      aria-labelledby={titleId}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: (theme) =>
            theme.palette.mode === 'light' ? '0 12px 24px rgba(0,0,0,0.15)' : '0 12px 24px rgba(0,0,0,0.4)',
        },
        '&:hover .preview-overlay': {
          opacity: 1,
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <ImageWithFallback
          src={cover.src}
          srcSet={cover.srcSet}
          sizes={cover.sizes}
          alt={altOf(project.images[0])}
          type="project"
          aspectRatio={`${PROJECT_COVER_RATIO.width}/${PROJECT_COVER_RATIO.height}`}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          sx={{
            width: '100%',
            backgroundColor: 'rgba(0,0,0,0.05)',
            transition: 'transform 0.3s',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        />

        <Box
          component="button"
          type="button"
          aria-label={t('projects.openGallery', { title })}
          onClick={() => setGalleryOpen(true)}
          sx={{
            position: 'absolute',
            inset: 0,
            cursor: 'pointer',
            zIndex: 1,
            border: 0,
            padding: 0,
            appearance: 'none',
            backgroundColor: 'transparent',
            '&:focus-visible': {
              outline: '3px solid white',
              outlineOffset: '-3px',
              '& .preview-overlay': { opacity: 1 },
            },
          }}
        >
          <Box
            className="preview-overlay"
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.3s',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: 56,
                height: 56,
              }}
            >
              <VisibilityIcon fontSize="large" aria-hidden="true" />
            </Box>
          </Box>
          {/* Always visible, so touch screens (no hover) also show that the cover opens a gallery. */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              left: 10,
              bottom: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'common.white',
              typography: 'caption',
              fontWeight: 600,
            }}
          >
            <PhotoLibraryIcon sx={{ fontSize: 16 }} />
            {project.images.length}
          </Box>
        </Box>

        <Chip
          label={t(`projects.types.${project.type}`)}
          icon={TYPE_ICONS[project.type]}
          size="small"
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            // Cover images can be white; a solid surface keeps the label readable in glass.
            bgcolor: (theme) => (theme.palette.mode === 'light' ? theme.palette.common.white : theme.palette.grey[900]),
            color: 'text.primary',
            fontWeight: 600,
            boxShadow: 2,
            '& .MuiChip-icon': {
              color: 'primary.main',
            },
            '.MuiChip-label': {
              px: 1,
            },
          }}
        />
      </Box>
      <CardContent sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
          {/* Two reserved lines keep descriptions aligned across a row of cards. */}
          <Typography
            id={titleId}
            variant="h5"
            component={titleComponent}
            sx={{ fontWeight: 700, minHeight: { md: '2.67em' } }}
          >
            {title}
          </Typography>
          {project.featured && (
            <Tooltip title={featuredLabel}>
              <Box
                component="span"
                role="img"
                aria-label={featuredLabel}
                sx={{ display: 'inline-flex', flexShrink: 0, color: 'warning.main' }}
              >
                <StarIcon sx={{ fontSize: '1.5rem' }} />
              </Box>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ mb: 3 }}>
          <RichTextRenderer text={lead} variant="body2" />
          {rest && (
            <>
              <Box id={moreId} ref={contentRef}>
                <RichTextRenderer text={rest} variant="body2" />
              </Box>
              <Button
                size="small"
                onClick={toggle}
                aria-expanded={expanded}
                aria-controls={moreId}
                aria-describedby={titleId}
                sx={{ fontWeight: 600, px: 1 }}
              >
                {expanded ? t('projects.showLess') : t('projects.readMore')}
              </Button>
            </>
          )}
        </Box>
        <Stack direction="row" sx={{ mt: 'auto', flexWrap: 'wrap', gap: 1 }}>
          {project.technologies.map((tech) => (
            <Chip
              key={tech}
              label={tech}
              size="small"
              sx={{
                borderRadius: 1.5,
                fontWeight: 500,
                bgcolor: (theme) =>
                  theme.palette.mode === 'light' ? 'rgba(25, 118, 210, 0.08)' : 'rgba(144, 202, 249, 0.08)',
                border: 'none',
              }}
            />
          ))}
        </Stack>
      </CardContent>
      {project.links.length > 0 && (
        <CardActions disableSpacing sx={{ p: 3, pt: 0, justifyContent: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
          {project.links.map((link) => {
            const { labelKey, emphasis } = PROJECT_LINK_KINDS[link.kind]
            return (
              <Button
                key={link.url}
                size="small"
                startIcon={LINK_ICONS[link.kind]}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby={titleId}
                {...LINK_EMPHASIS_PROPS[emphasis]}
              >
                {t(labelKey)}
              </Button>
            )
          })}
        </CardActions>
      )}
      {galleryOpen && (
        <ProjectGallery
          title={title}
          slides={project.images.map((image) => ({
            src: projectImageUrl(image, 'full'),
            thumbSrc: projectImageUrl(image, 'thumb'),
            alt: altOf(image),
          }))}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </Card>
  )
}

export default ProjectCard
