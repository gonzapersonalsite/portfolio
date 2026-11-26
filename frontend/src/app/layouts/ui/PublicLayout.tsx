import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { Navbar } from '@/widgets/navbar'
import { Footer } from '@/widgets/footer'
import { useCanonicalLinks } from '../lib/useCanonicalLinks'
import { useRouteChangeFocus } from '../lib/useRouteChangeFocus'
import './PublicLayout.css'

const MAIN_CONTENT_ID = 'main-content'
// The return-to-top link appears once the visitor has scrolled this far.
const RETURN_TO_TOP_THRESHOLD = 400

const PublicLayout: React.FC = () => {
  const { t } = useTranslation()
  const [scrolledDown, setScrolledDown] = useState(false)

  useRouteChangeFocus(MAIN_CONTENT_ID)
  useCanonicalLinks()

  useEffect(() => {
    const syncScroll = () => setScrolledDown(window.scrollY > RETURN_TO_TOP_THRESHOLD)
    syncScroll()
    window.addEventListener('scroll', syncScroll, { passive: true })
    return () => window.removeEventListener('scroll', syncScroll)
  }, [])

  return (
    <div className="public-layout">
      <a href={`#${MAIN_CONTENT_ID}`} className="skip-link">
        {t('common.skipToContent')}
      </a>

      <Navbar />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="public-layout__main">
        <Outlet />
      </main>

      <Footer />
      <a
        href="#root"
        className={scrolledDown ? 'return-to-top visible' : 'return-to-top'}
        aria-label={t('common.returnToTop')}
      >
        ↑
      </a>
    </div>
  )
}

export default PublicLayout
