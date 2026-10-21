import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, useScrollTrigger } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { Navbar } from '@/widgets/navbar'
import { Footer } from '@/widgets/footer'
import { useColorMode } from '@/features/theme-switch'
import { useCanonicalLinks } from '../lib/useCanonicalLinks'
import { useRouteChangeFocus } from '../lib/useRouteChangeFocus'

const MAIN_CONTENT_ID = 'main-content'
// The return-to-top link appears once the visitor has scrolled this far.
const RETURN_TO_TOP_THRESHOLD = 400

const PublicLayout: React.FC = () => {
  const { t } = useTranslation()
  const { mode } = useColorMode()
  const scrolledDown = useScrollTrigger({ threshold: RETURN_TO_TOP_THRESHOLD, disableHysteresis: true })
  useRouteChangeFocus(MAIN_CONTENT_ID)
  useCanonicalLinks()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      {mode === 'glass' && <div className="liquid-glass-bg" />}
      <a href={`#${MAIN_CONTENT_ID}`} className="skip-link">
        {t('common.skipToContent')}
      </a>

      <Navbar />
      <Box
        component="main"
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        sx={{ flexGrow: 1, minHeight: '100vh', outline: 'none' }}
      >
        <Outlet />
      </Box>

      <Footer />
      <a
        href="#root"
        className={scrolledDown ? 'return-to-top visible' : 'return-to-top'}
        aria-label={t('common.returnToTop')}
      >
        ↑
      </a>
    </Box>
  )
}

export default PublicLayout
