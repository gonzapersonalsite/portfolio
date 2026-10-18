import React from 'react'
import { Box, Container, Typography, Paper, Chip, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  timelineOppositeContentClasses,
} from '@mui/lab'
import BusinessIcon from '@mui/icons-material/Business'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { getAllExperiences } from '@/entities/experience'
import { useLanguage } from '@/features/language-switch'
import { RichTextRenderer, EmptyState, StatusBadge } from '@/shared/ui'
import ExploreIcon from '@mui/icons-material/Explore'
import { formatPeriod, getLocalizedText, useContent, usePageMeta } from '@/shared/lib'

const ExperiencePage: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const theme = useTheme()

  usePageMeta({
    title: t('seo.experience.title'),
    description: t('seo.experience.description'),
  })

  const { data: experiences } = useContent(() => getAllExperiences())

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="overline" color="primary" sx={{ fontWeight: 'bold' }}>
          {t('nav.experience')}
        </Typography>
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: '800' }}>
          {t('experience.heading')}
        </Typography>
        <Box sx={{ mb: 6 }}>
          <StatusBadge label={t('common.openToWork')} />
        </Box>

        {experiences.length > 0 ? (
          <Timeline
            position="right"
            sx={{
              [`& .${timelineOppositeContentClasses.root}`]: {
                flex: 0.3,
              },
              p: 0,
            }}
          >
            {experiences.map((exp, index) => {
              const period = formatPeriod(exp.startDate, exp.endDate, language, t('common.present'))
              return (
                <TimelineItem key={exp.id}>
                  <TimelineOppositeContent
                    color="text.secondary"
                    sx={{ py: '12px', px: 2, display: { xs: 'none', md: 'block' } }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <CalendarMonthIcon fontSize="small" />
                      <Typography variant="body2" sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                        {period}
                      </Typography>
                    </Box>
                  </TimelineOppositeContent>

                  <TimelineSeparator>
                    <TimelineDot color={index === 0 ? 'primary' : 'grey'} variant={index === 0 ? 'filled' : 'outlined'}>
                      <BusinessIcon />
                    </TimelineDot>
                    {index < experiences.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>

                  {/* minWidth 0 lets the card shrink to the phone width instead of overflowing. */}
                  <TimelineContent sx={{ py: '12px', px: 2, minWidth: 0 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        mb: 4,
                        width: '100%',
                        bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: theme.shadows[4],
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: { xs: 'flex', md: 'none' },
                          alignItems: 'center',
                          gap: 1,
                          mb: 1,
                          color: 'text.secondary',
                        }}
                      >
                        <CalendarMonthIcon fontSize="small" />
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          {period}
                        </Typography>
                      </Box>

                      <Typography variant="h6" component="h2" color="primary" sx={{ fontWeight: 'bold' }}>
                        {getLocalizedText(language, exp.positionEn, exp.positionEs)}
                      </Typography>
                      <Typography variant="subtitle1" component="p" gutterBottom sx={{ fontWeight: '500' }}>
                        {getLocalizedText(language, exp.companyEn, exp.companyEs)}
                      </Typography>
                      <Box sx={{ mt: 2, mb: 2 }}>
                        <RichTextRenderer text={getLocalizedText(language, exp.descriptionEn, exp.descriptionEs)} />
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                        {exp.technologies.map((tech) => (
                          <Chip
                            key={tech}
                            label={tech}
                            size="small"
                            variant="outlined"
                            // Long names wrap inside the chip instead of widening the card.
                            sx={{
                              maxWidth: '100%',
                              height: 'auto',
                              '& .MuiChip-label': { whiteSpace: 'normal', py: 0.25 },
                            }}
                          />
                        ))}
                      </Box>
                    </Paper>
                  </TimelineContent>
                </TimelineItem>
              )
            })}
          </Timeline>
        ) : (
          <EmptyState
            title={t('emptyState.experience.title')}
            description={t('emptyState.experience.description')}
            icon={<ExploreIcon />}
          />
        )}
      </Container>
    </Box>
  )
}

export default ExperiencePage
