import React, { useEffect } from 'react'
import { Box, Container, Typography, IconButton, useTheme } from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import EmailIcon from '@mui/icons-material/Email'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/features/language-switch'
import { useColorMode } from '@/features/theme-switch'
import { getProfile } from '@/entities/profile'
import { glassColors, glassEffects } from '@/shared/config'
import { getLocalizedText, useContent } from '@/shared/lib'

const Footer: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { mode } = useColorMode()
  const theme = useTheme()
  const currentYear = new Date().getFullYear()
  const isGlass = mode === 'glass'

  const { data: profile } = useContent(() => getProfile())
  const fullName = getLocalizedText(language, profile.fullNameEn, profile.fullNameEs)

  const socialLinks = {
    github: profile.githubUrl,
    linkedin: profile.linkedinUrl,
    email: `mailto:${profile.email}`,
  }

  const textColor = isGlass ? glassColors.text.primary : 'text.primary'
  const secondaryTextColor = isGlass ? glassColors.text.secondary : 'text.secondary'

  // Deliberate easter egg for developers who open the console: the running version and commit.
  // Kept on purpose (docs/MIGRATION_PLAN.md); failures are reported separately.
  useEffect(() => {
    console.info(
      `%c🚀 Portafolio v${__APP_VERSION__} (%c${__COMMIT_HASH__}%c)`,
      'color: #00e5ff; font-weight: bold; font-size: 12px; padding: 4px;',
      'color: #b388ff; font-weight: normal;',
      'color: #00e5ff; font-weight: bold;',
    )
  }, [])

  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        px: 2,
        mt: 'auto',
        backgroundColor: isGlass
          ? 'rgba(12, 20, 35, 0.4)'
          : theme.palette.mode === 'light'
            ? theme.palette.grey[100]
            : theme.palette.grey[900],
        backdropFilter: isGlass ? glassEffects.blur : 'none',
        borderTop: isGlass ? glassEffects.border : `1px solid ${theme.palette.divider}`,
        boxShadow: isGlass ? `inset 0 1px 0 0 rgba(255,255,255,0.05), ${glassEffects.innerBoxShadow}` : 'none',
        color: textColor,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h6" component="p" sx={{ color: textColor, fontWeight: 'bold' }}>
              {fullName}
            </Typography>
            <Typography variant="body2" sx={{ color: secondaryTextColor }}>
              {getLocalizedText(language, profile.subtitleEn, profile.subtitleEs)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {socialLinks.github && (
              <IconButton
                href={socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                color="inherit"
                sx={{
                  transition: 'all 0.3s ease',
                  '&:hover': isGlass
                    ? {
                        color: glassColors.neon.turquoise,
                        transform: 'translateY(-3px)',
                        filter: `drop-shadow(0 0 8px ${glassColors.neon.turquoise})`,
                      }
                    : {},
                }}
              >
                <GitHubIcon />
              </IconButton>
            )}
            {socialLinks.linkedin && (
              <IconButton
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                color="inherit"
                sx={{
                  transition: 'all 0.3s ease',
                  '&:hover': isGlass
                    ? {
                        color: glassColors.neon.violet,
                        transform: 'translateY(-3px)',
                        filter: `drop-shadow(0 0 8px ${glassColors.neon.violet})`,
                      }
                    : {},
                }}
              >
                <LinkedInIcon />
              </IconButton>
            )}
            {socialLinks.email && (
              <IconButton
                href={socialLinks.email}
                aria-label={t('contact.email')}
                color="inherit"
                sx={{
                  transition: 'all 0.3s ease',
                  '&:hover': isGlass
                    ? {
                        color: glassColors.neon.pink,
                        transform: 'translateY(-3px)',
                        filter: `drop-shadow(0 0 8px ${glassColors.neon.pink})`,
                      }
                    : {},
                }}
              >
                <EmailIcon />
              </IconButton>
            )}
          </Box>

          <Typography variant="body2" sx={{ color: secondaryTextColor, textAlign: 'center' }}>
            © {currentYear} {fullName}. {t('footer.rights')}
            <Box component="span" sx={{ display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
              v{__APP_VERSION__} · {__COMMIT_HASH__}
            </Box>
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default Footer
