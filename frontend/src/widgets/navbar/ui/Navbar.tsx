import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSelector, useLanguage } from '@/features/language-switch'
import { ThemeSelector } from '@/features/theme-switch'
import { getProfile } from '@/entities/profile'
import { APP_ROUTES, findAppRoute, localizedPath } from '@/shared/config'
import { useContent } from '@/shared/lib'
import { BrandMarkIcon, CloseIcon, MenuIcon } from '@/shared/ui'
import './Navbar.css'

const MOBILE_NAV_ID = 'mobile-navigation'

const Brand: React.FC<{ logoText: string }> = ({ logoText }) => {
  const accentStart = logoText.lastIndexOf(' ') + 1
  return (
    <>
      {logoText.slice(0, accentStart)}
      <span className="site-brand__surname">{logoText.slice(accentStart)}</span>
    </>
  )
}

const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { pathname } = useLocation()
  const currentRoute = findAppRoute(pathname)
  const homePath = localizedPath('/', language)
  const { data: profile } = useContent(() => getProfile())

  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const navItems = APP_ROUTES.map((route) => ({
    path: localizedPath(route.path, language),
    label: t(`nav.${route.id}`),
    current: currentRoute?.id === route.id,
  }))

  const closeDrawer = useCallback(() => {
    setMobileOpen(false)
    const dialog = dialogRef.current
    if (dialog?.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
    const opener = openerRef.current ?? menuButtonRef.current
    if (opener?.isConnected && document.activeElement !== opener) {
      opener.focus()
    }
  }, [])

  const openDrawer = () => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : menuButtonRef.current
    setMobileOpen(true)
  }

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (mobileOpen) {
      dialog.setAttribute('closedby', 'any')
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        else dialog.setAttribute('open', '')
      }
      if (!dialog.contains(document.activeElement)) {
        closeButtonRef.current?.focus()
      }
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [mobileOpen])

  return (
    <header className="site-header wb-no-print">
      <div className="wb-container site-header__inner">
        <RouterLink to={homePath} className="site-brand">
          <BrandMarkIcon className="site-brand__mark" />
          <span className="site-brand__text">
            <Brand logoText={profile.logoText} />
          </span>
        </RouterLink>

        <nav aria-label={t('nav.main')}>
          <ul className="site-nav">
            {navItems.map((item) => (
              <li key={item.path}>
                <RouterLink to={item.path} className="site-nav__link" aria-current={item.current ? 'page' : undefined}>
                  {item.label}
                </RouterLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__tools">
          <LanguageSelector />
          <ThemeSelector />
          <button
            ref={menuButtonRef}
            type="button"
            className="site-menu-btn"
            aria-label={t('nav.openMenu')}
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
            aria-controls={MOBILE_NAV_ID}
            onClick={openDrawer}
          >
            <MenuIcon className="site-menu-btn__icon" />
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        id={MOBILE_NAV_ID}
        className="mobile-drawer"
        aria-label={t('nav.menu')}
        onCancel={(event) => {
          event.preventDefault()
          closeDrawer()
        }}
        onClose={closeDrawer}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            closeDrawer()
          }
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeDrawer()
        }}
      >
        <div className="mobile-drawer__sheet">
          <div className="mobile-drawer__head">
            <p className="mobile-drawer__brand">
              <Brand logoText={profile.logoText} />
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              className="mobile-drawer__close"
              aria-label={t('nav.closeMenu')}
              onClick={closeDrawer}
            >
              <CloseIcon />
            </button>
          </div>

          <nav aria-label={t('nav.main')}>
            <ul className="mobile-drawer__list">
              {navItems.map((item) => (
                <li key={item.path}>
                  <RouterLink
                    to={item.path}
                    className="mobile-drawer__link"
                    aria-current={item.current ? 'page' : undefined}
                    onClick={closeDrawer}
                  >
                    {item.label}
                  </RouterLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mobile-drawer__footer">
            <LanguageSelector />
            <ThemeSelector />
          </div>
        </div>
      </dialog>
    </header>
  )
}

export default Navbar
