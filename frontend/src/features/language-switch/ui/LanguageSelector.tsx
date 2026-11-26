import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Language } from '@/shared/config'
import { useLanguage } from '../model/LanguageContext'
import './LanguageSelector.css'

// Option 2 (visual redesign): standard direct controls with each language named in its own script.
const LANGUAGE_OPTIONS: ReadonlyArray<{ code: Language; shortLabel: string; nativeName: string }> = [
  { code: 'es', shortLabel: 'ES', nativeName: 'Español' },
  { code: 'en', shortLabel: 'EN', nativeName: 'English' },
]

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage()
  const { t } = useTranslation()

  return (
    <div className="lang-switch" role="group" aria-label={t('common.languageGroup')}>
      {LANGUAGE_OPTIONS.map((option) => {
        const selected = language === option.code
        return (
          <button
            key={option.code}
            type="button"
            lang={option.code}
            className="lang-switch__btn"
            aria-label={option.nativeName}
            aria-pressed={selected}
            onClick={() => {
              if (!selected) setLanguage(option.code)
            }}
          >
            {option.shortLabel}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSelector
