import React from 'react'
import { useTranslation } from 'react-i18next'
import { ContactForm } from '@/features/contact-form'
import { useNotification } from '@/features/notifications'
import { useLanguage } from '@/features/language-switch'
import { getProfile } from '@/entities/profile'
import { getLocalizedText, useContent, usePageMeta } from '@/shared/lib'
import { EmailIcon, GitHubIcon, LinkedInIcon, LocationIcon } from '@/shared/ui'
import { PixelGoblin } from '@/widgets/pixel-goblin'
import './ContactPage.css'

const ContactPage: React.FC = () => {
  const { language } = useLanguage()
  const { t } = useTranslation()
  const { showNotification } = useNotification()
  const { data: profile } = useContent(() => getProfile())
  const [emailUser, emailDomain] = profile.email.split('@')

  usePageMeta({
    title: t('seo.contact.title'),
    description: t('seo.contact.description'),
  })

  const socialLinks = [
    { icon: <GitHubIcon />, url: profile.githubUrl, label: 'GitHub' },
    { icon: <LinkedInIcon />, url: profile.linkedinUrl, label: 'LinkedIn' },
  ]

  return (
    <div className="wb-page wb-container">
      <div className="wb-page-header">
        <p className="wb-eyebrow">{t('nav.contact')}</p>
        <h1 className="wb-page-title">{t('contact.heading')}</h1>
      </div>

      <div className="contact-grid">
        <div className="contact-info">
          <div>
            <h2 className="contact-info__subtitle">{t('contact.subtitle')}</h2>
            <p className="contact-info__desc">{t('contact.description')}</p>
          </div>

          <div className="contact-channels">
            <div className="wb-panel contact-channel">
              <div className="contact-channel__icon" aria-hidden="true">
                <EmailIcon />
              </div>
              <div className="contact-channel__body">
                <span className="contact-channel__label">{t('contact.email')}</span>
                {/* Break after "@" on narrow phones instead of widening the viewport. */}
                <a href={`mailto:${profile.email}`} className="contact-channel__link">
                  {emailUser}@<wbr />
                  {emailDomain}
                </a>
              </div>
            </div>

            <div className="wb-panel contact-channel">
              <div className="contact-channel__icon" aria-hidden="true">
                <LocationIcon />
              </div>
              <div className="contact-channel__body">
                <span className="contact-channel__label">{t('contact.location')}</span>
                <p className="contact-channel__value">
                  {getLocalizedText(language, profile.locationEn, profile.locationEs)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="contact-social__title">{t('contact.social')}</h3>
            <div className="contact-social__links">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wb-btn-secondary"
                >
                  {link.icon}
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="wb-panel contact-form-card">
          <PixelGoblin />
          <div className="contact-form-card__body">
            <ContactForm onShowNotification={showNotification} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactPage
