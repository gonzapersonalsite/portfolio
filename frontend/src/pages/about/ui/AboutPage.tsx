import React from 'react'
import { Box, Container, Typography, Grid, Button, Stack, Chip, Divider, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import DownloadIcon from '@mui/icons-material/Download'
import WorkIcon from '@mui/icons-material/Work'
import CodeIcon from '@mui/icons-material/Code'

import { useLanguage } from '@/features/language-switch'
import { getCoreSkills, type Skill } from '@/entities/skill'
import { getAllSpokenLanguages } from '@/entities/spoken-language'
import { getProfile } from '@/entities/profile'
import { getLocalizedText, useContent, usePageMeta } from '@/shared/lib'
import { ImageWithFallback, RichTextRenderer } from '@/shared/ui'

const skillNames = (skills: Skill[], language: string): string =>
  skills.map((skill) => getLocalizedText(language, skill.nameEn, skill.nameEs)).join(', ')

const AboutPage: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const theme = useTheme()

  usePageMeta({
    title: t('seo.about.title'),
    description: t('seo.about.description'),
  })

  const { data: competencies } = useContent(() => getCoreSkills())
  const { data: spokenLanguages } = useContent(() => getAllSpokenLanguages())
  const { data: profile } = useContent(() => getProfile())

  const frontendSkills = competencies.filter((skill) => skill.category === 'Frontend')
  const backendSkills = competencies.filter((skill) => skill.category === 'Backend' || skill.category === 'Database')

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="overline" color="primary" sx={{ fontWeight: 'bold' }}>
          {t('nav.about')}
        </Typography>
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
          {getLocalizedText(language, profile.aboutTitleEn, profile.aboutTitleEs)}
        </Typography>

        <Grid container spacing={6} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            {/* Above the fold and the page's LCP element: the route shell preloads it too. */}
            <ImageWithFallback
              src={profile.imageUrl}
              alt={getLocalizedText(language, profile.fullNameEn, profile.fullNameEs)}
              type="profile"
              aspectRatio="2/3"
              loading="eager"
              fetchPriority="high"
              sx={{
                maxWidth: 400,
                margin: '0 auto',
                display: 'block',
                borderRadius: 4,
                boxShadow: theme.shadows[10],
              }}
            />
            <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<DownloadIcon />}
                href={profile.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                disabled={!profile.cvUrl}
              >
                {t('home.resume')}
              </Button>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              {getLocalizedText(language, profile.aboutIntroTitleEn, profile.aboutIntroTitleEs)}
            </Typography>

            <RichTextRenderer text={getLocalizedText(language, profile.aboutSummaryEn, profile.aboutSummaryEs)} />

            <Box sx={{ mt: 2 }}>
              <RichTextRenderer
                text={getLocalizedText(language, profile.aboutPhilosophyEn, profile.aboutPhilosophyEs)}
              />
            </Box>

            <Box
              sx={{
                mt: 4,
                mb: 2,
                p: 3,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderRadius: 2,
                borderLeft: `4px solid ${theme.palette.primary.main}`,
              }}
            >
              <Typography variant="subtitle1" component="h3" gutterBottom color="primary" sx={{ fontWeight: 'bold' }}>
                {t('about.sentenceTitle')}
              </Typography>
              <Typography variant="body1" sx={{ fontStyle: 'italic', fontSize: '1.1rem' }}>
                "{getLocalizedText(language, profile.sentenceEn, profile.sentenceEs)}"
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CodeIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
                    <Box>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                        {t('skills.categories.Frontend')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {skillNames(frontendSkills, language)}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WorkIcon color="secondary" sx={{ mr: 2, fontSize: 32 }} />
                    <Box>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                        {t('skills.categories.Backend')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {skillNames(backendSkills, language)}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Grid>
            </Grid>

            {competencies.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  {t('about.skills')}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                  {competencies.map((skill) => (
                    <Chip
                      key={skill.id}
                      label={getLocalizedText(language, skill.nameEn, skill.nameEs)}
                      variant="outlined"
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {spokenLanguages.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  {t('about.languages')}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                  {spokenLanguages.map((lang) => (
                    <Chip
                      key={lang.id}
                      label={`${getLocalizedText(language, lang.nameEn, lang.nameEs)} (${getLocalizedText(language, lang.levelEn, lang.levelEs)})`}
                      color="default"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default AboutPage
