import React from 'react'
import { Box, Container, Typography, Grid, Paper, IconButton, Link, Stack, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import EmailIcon from '@mui/icons-material/Email'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import GitHubIcon from '@mui/icons-material/GitHub'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import { ContactForm } from '@/features/contact-form'
import { useNotification } from '@/features/notifications'
import { useLanguage } from '@/features/language-switch'
import { getProfile } from '@/entities/profile'
import { getLocalizedText, useContent, usePageMeta } from '@/shared/lib'

// Fixed 48px circles: padding around an inline SVG made them taller than wide.
const iconCircleSx = {
  width: 48,
  height: 48,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
} as const

const ContactPage: React.FC = () => {
  const { language } = useLanguage()
  const { t } = useTranslation()
  const theme = useTheme()
  const { showNotification } = useNotification()
  const { data: profile } = useContent(() => getProfile())
  const [emailUser, emailDomain] = profile.email.split('@')

  usePageMeta({
    title: t('seo.contact.title'),
    description: t('seo.contact.description'),
  })

  const socialLinks = [
    { icon: <GitHubIcon fontSize="large" />, url: profile.githubUrl, label: 'GitHub' },
    { icon: <LinkedInIcon fontSize="large" />, url: profile.linkedinUrl, label: 'LinkedIn' },
  ]

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="overline" color="primary" sx={{ fontWeight: 'bold' }}>
          {t('nav.contact')}
        </Typography>
        <Typography variant="h2" component="h1" gutterBottom sx={{ mb: 6, fontWeight: 800 }}>
          {t('contact.heading')}
        </Typography>

        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                {t('contact.subtitle')}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.1rem' }}>
                {t('contact.description')}
              </Typography>

              <Stack spacing={3} sx={{ mb: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={iconCircleSx}>
                    <EmailIcon aria-hidden="true" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {t('contact.email')}
                    </Typography>
                    {/* On narrow phones the address breaks after the "@" (the <wbr>) instead
                                            of widening the page; overflowWrap is the last resort. */}
                    <Link
                      href={`mailto:${profile.email}`}
                      variant="body1"
                      underline="hover"
                      sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}
                    >
                      {emailUser}@<wbr />
                      {emailDomain}
                    </Link>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={iconCircleSx}>
                    <LocationOnIcon aria-hidden="true" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {t('contact.location')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {getLocalizedText(language, profile.locationEn, profile.locationEs)}
                    </Typography>
                  </Box>
                </Box>
              </Stack>

              <Box>
                <Typography variant="subtitle2" component="h3" gutterBottom sx={{ mb: 2 }}>
                  {t('contact.social')}
                </Typography>
                <Stack direction="row" spacing={2}>
                  {socialLinks.map((link) => (
                    <IconButton
                      key={link.label}
                      component="a"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        '&:hover': {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      {link.icon}
                    </IconButton>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 5 },
                borderRadius: 4,
                bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <ContactForm onShowNotification={showNotification} />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default ContactPage
