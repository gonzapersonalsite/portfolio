import React from 'react'
import { Box, Container, Typography, Grid, LinearProgress, Paper, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { getSkillGroups } from '@/entities/skill'
import { useLanguage } from '@/features/language-switch'
import { EmptyState } from '@/shared/ui'
import PsychologyIcon from '@mui/icons-material/Psychology'
import { formatPercent, getLocalizedText, useContent, usePageMeta } from '@/shared/lib'

const SkillsPage: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const theme = useTheme()

  usePageMeta({
    title: t('seo.skills.title'),
    description: t('seo.skills.description'),
  })

  const { data: skillGroups } = useContent(() => getSkillGroups())

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="overline" color="primary" sx={{ fontWeight: 'bold' }}>
          {t('nav.skills')}
        </Typography>
        <Typography variant="h2" component="h1" gutterBottom sx={{ mb: 6, fontWeight: '800' }}>
          {t('skills.heading')}
        </Typography>

        <Grid container spacing={4}>
          {skillGroups.length > 0 ? (
            skillGroups.map(({ category, skills }) => (
              <Grid size={{ xs: 12, md: 6 }} key={category}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50',
                    borderRadius: 4,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography
                    variant="h5"
                    component="h2"
                    gutterBottom
                    color="primary"
                    sx={{ mb: 3, fontWeight: 'bold' }}
                  >
                    {t(`skills.categories.${category}`)}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {skills.map((skill) => (
                      <Box key={skill.id}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            gap: 2,
                            mb: 1,
                          }}
                        >
                          <Typography variant="subtitle1" component="p" sx={{ fontWeight: '600' }}>
                            {getLocalizedText(language, skill.nameEn, skill.nameEs)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {formatPercent(skill.level, language)}
                          </Typography>
                        </Box>
                        {/* Decorative: the name and the percentage above already say it all. */}
                        <LinearProgress
                          variant="determinate"
                          value={skill.level}
                          aria-hidden="true"
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            ))
          ) : (
            <Grid size={{ xs: 12 }}>
              <EmptyState
                title={t('emptyState.skills.title')}
                description={t('emptyState.skills.description')}
                icon={<PsychologyIcon />}
              />
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  )
}

export default SkillsPage
