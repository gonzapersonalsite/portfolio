import React from 'react'
import { Box, Container, Typography, Button, Grid, useTheme, Chip, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import DownloadIcon from '@mui/icons-material/Download'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CodeIcon from '@mui/icons-material/Code'
import StorageIcon from '@mui/icons-material/Storage'
import WebIcon from '@mui/icons-material/Web'
import { keyframes } from '@emotion/react'
import { ProjectCard, getFeaturedProjects } from '@/entities/project'
import { getProfile } from '@/entities/profile'
import { useLanguage } from '@/features/language-switch'
import { useColorMode } from '@/features/theme-switch'
import { Link as RouterLink } from 'react-router-dom'
import type { ColorMode } from '@/shared/config'
import { getLocalizedText, useContent, usePageMeta } from '@/shared/lib'
import { ImageWithFallback, RichTextRenderer, EmptyState, StatusBadge } from '@/shared/ui'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import { PixelGoblin } from '@/widgets/pixel-goblin'

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`

// Where the hero gradient starts (top left, behind the greeting and the buttons). Dark enough in
// the dark themes for white text to pass 4.5:1; glass keeps its violet.
const HERO_GRADIENT_START: Record<ColorMode, string> = {
  light: '#42a5f5',
  dark: '#0d47a1',
  glass: '#4b35b8',
}

const HomePage: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { mode } = useColorMode()
  const theme = useTheme()

  usePageMeta({
    title: t('seo.home.title'),
    description: t('seo.home.description'),
  })

  const { data: featuredProjects } = useContent(() => getFeaturedProjects())
  const { data: profile } = useContent(() => getProfile())

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${HERO_GRADIENT_START[mode]} 0%, ${theme.palette.background.default} 100%)`,
          position: 'relative',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="overline" color="text.primary" sx={{ letterSpacing: 2, fontWeight: 'bold' }}>
                {getLocalizedText(language, profile.greetingEn, profile.greetingEs)}
              </Typography>
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  background:
                    theme.palette.mode === 'dark'
                      ? `linear-gradient(45deg, #fff 30%, ${theme.palette.primary.main} 90%)`
                      : `linear-gradient(45deg, ${theme.palette.text.primary} 30%, ${theme.palette.primary.main} 90%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {getLocalizedText(language, profile.fullNameEn, profile.fullNameEs)}
              </Typography>
              <Typography variant="h4" component="p" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                {getLocalizedText(language, profile.subtitleEn, profile.subtitleEs)}
              </Typography>
              <Box sx={{ mb: 4 }}>
                <StatusBadge label={t('common.openToWork')} />
              </Box>

              <Box sx={{ maxWidth: 600, mb: 4 }}>
                <RichTextRenderer text={getLocalizedText(language, profile.descriptionEn, profile.descriptionEs)} />
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  component={RouterLink}
                  nativeButton={false}
                  to="/projects"
                >
                  {t('home.cta')}
                </Button>
                {/* A solid surface: outlined text straight on the gradient falls below 4.5:1. */}
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<DownloadIcon />}
                  href={profile.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  disabled={!profile.cvUrl}
                  sx={
                    mode === 'glass'
                      ? undefined
                      : { bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }
                  }
                >
                  {t('home.resume')}
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box
                sx={{
                  // Share the appearance control with the status dot; system motion preferences win.
                  '@media (prefers-reduced-motion: no-preference)': {
                    animation: `${float} 6s ease-in-out infinite`,
                    animationPlayState: 'var(--decorative-animation-state, paused)',
                    willChange: 'transform',
                  },
                  '@media print': { animation: 'none' },
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <PixelGoblin />
                <Box
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    bgcolor: 'background.paper',
                    boxShadow: theme.shadows[10],
                    border: `1px solid ${theme.palette.divider}`,
                    position: 'relative',
                  }}
                >
                  <Stack spacing={2}>
                    <Chip icon={<CodeIcon />} label={t('home.chips.frontend')} color="primary" variant="outlined" />
                    <Chip icon={<StorageIcon />} label={t('home.chips.backend')} color="secondary" variant="outlined" />
                    <Chip icon={<WebIcon />} label={t('home.chips.uiux')} color="success" variant="outlined" />
                  </Stack>
                  <Typography variant="caption" sx={{ mt: 2, fontFamily: 'monospace', display: 'block' }}>
                    {t('home.chips.passion')}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    opacity: 0.2,
                    zIndex: -1,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -20,
                    left: -20,
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    opacity: 0.1,
                    zIndex: -1,
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: 8, bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50' }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 6,
            }}
          >
            <Typography variant="h3" component="h2" sx={{ fontWeight: '800', fontSize: { xs: '1.75rem', sm: '2rem' } }}>
              {t('projects.featured')}
            </Typography>
            <Button
              endIcon={<ArrowForwardIcon />}
              component={RouterLink}
              nativeButton={false}
              to="/projects"
              size="large"
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {t('projects.viewAll')}
            </Button>
          </Box>
          {featuredProjects.length > 0 ? (
            <Grid container component="ul" spacing={4} sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {featuredProjects.map((project) => (
                <Grid component="li" size={{ xs: 12, md: 6, lg: 4 }} key={project.id}>
                  <ProjectCard project={project} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <EmptyState
              title={t('emptyState.featured.title')}
              description={t('emptyState.featured.description')}
              icon={<RocketLaunchIcon />}
            />
          )}
        </Container>
      </Box>

      <Container sx={{ py: 10 }}>
        <Grid container spacing={6} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <ImageWithFallback
              src={profile.imageUrl}
              alt={getLocalizedText(language, profile.fullNameEn, profile.fullNameEs)}
              type="profile"
              aspectRatio="2/3"
              loading="lazy"
              sx={{
                maxWidth: 400,
                margin: '0 auto',
                display: 'block',
                borderRadius: 4,
                boxShadow: theme.shadows[8],
                transform: 'rotate(-2deg)',
                transition: 'transform 0.3s',
                '&:hover': { transform: 'rotate(0deg)' },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="overline" color="secondary" sx={{ fontWeight: 'bold', letterSpacing: 1.5 }}>
              {t('about.subtitle')}
            </Typography>
            <Typography variant="h3" component="h2" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
              {getLocalizedText(language, profile.aboutTitleEn, profile.aboutTitleEs)}
            </Typography>
            <Box sx={{ mb: 3, '& p': { fontSize: '1.1rem' } }}>
              <RichTextRenderer text={getLocalizedText(language, profile.aboutSummaryEn, profile.aboutSummaryEs)} />
            </Box>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              component={RouterLink}
              nativeButton={false}
              to="/about"
            >
              {t('about.more')}
            </Button>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default HomePage
