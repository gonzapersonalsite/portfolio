import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/features/language-switch'
import { getProfile } from '@/entities/profile'
import { getLocalizedText, useContent } from '@/shared/lib'
import { EmailIcon, GitHubIcon, LinkedInIcon } from '@/shared/ui'
import './Footer.css'

const Footer: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const currentYear = new Date().getFullYear()
  const { data: profile } = useContent(() => getProfile())

  // Deliberate console easter egg for visitors inspecting developer tools.
  useEffect(() => {
    console.info(
      `%c🚀 Portafolio v${__APP_VERSION__} (%c${__COMMIT_HASH__}%c)`,
      'color: #ff7847; font-weight: bold; font-size: 12px; padding: 4px;',
      'color: #8a8f98; font-weight: normal;',
      'color: #ff7847; font-weight: bold;',
    )
  }, [])

  return (
    <footer className="site-footer wb-no-print">
      <div className="wb-container site-footer__inner">
        <div>
          <p className="site-footer__name">{profile.alternateName}</p>
          <p className="site-footer__role">{getLocalizedText(language, profile.subtitleEn, profile.subtitleEs)}</p>
        </div>

        <div className="site-footer__social">
          {profile.githubUrl && (
            <a
              className="site-footer__icon-link"
              href={profile.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <GitHubIcon />
            </a>
          )}
          {profile.linkedinUrl && (
            <a
              className="site-footer__icon-link"
              href={profile.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <LinkedInIcon />
            </a>
          )}
          {profile.email && (
            <a className="site-footer__icon-link" href={`mailto:${profile.email}`} aria-label={t('contact.email')}>
              <EmailIcon />
            </a>
          )}
        </div>

        <p className="site-footer__meta">
          © {currentYear} {profile.alternateName}. {t('footer.rights')}
          <span className="site-footer__version">
            v{__APP_VERSION__} · {__COMMIT_HASH__}
          </span>
        </p>
      </div>
    </footer>
  )
}

export default Footer
