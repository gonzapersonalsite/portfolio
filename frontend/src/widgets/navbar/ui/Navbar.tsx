import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  useScrollTrigger,
  Container,
  Slide,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSelector, useLanguage } from '@/features/language-switch'
import { ThemeSelector, useColorMode } from '@/features/theme-switch'
import { getProfile } from '@/entities/profile'
import { APP_ROUTES, findAppRoute, glassColors, glassEffects, localizedPath } from '@/shared/config'
import { useContent } from '@/shared/lib'

const MOBILE_NAV_ID = 'mobile-navigation'

interface Props {
  children: React.ReactElement
}

function HideOnScroll(props: Props) {
  const { children } = props
  const trigger = useScrollTrigger()

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  )
}

const Brand: React.FC<{ logoText: string }> = ({ logoText }) => {
  const accentStart = logoText.lastIndexOf(' ') + 1
  return (
    <>
      {logoText.slice(0, accentStart)}
      <Box component="span" sx={{ color: 'primary.main' }}>
        {logoText.slice(accentStart)}
      </Box>
    </>
  )
}

const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { mode } = useColorMode()
  const { pathname } = useLocation()
  const currentRoute = findAppRoute(pathname)
  const homePath = localizedPath('/', language)
  const isGlass = mode === 'glass'
  // In glass mode the bar is the theme's dark translucent AppBar, so its text is light.
  const textColor = isGlass ? glassColors.text.primary : 'inherit'

  const { data: profile } = useContent(() => getProfile())

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const navItems = APP_ROUTES.map((route) => ({
    path: localizedPath(route.path, language),
    label: t(`nav.${route.id}`),
    current: currentRoute?.id === route.id,
  }))

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" component="p" sx={{ my: 2, fontWeight: 'bold', letterSpacing: '.1rem' }}>
        <Brand logoText={profile.logoText} />
      </Typography>
      <Box component="nav" aria-label={t('nav.main')}>
        <List>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                nativeButton={false}
                selected={item.current}
                aria-current={item.current ? 'page' : undefined}
                sx={{ textAlign: 'center' }}
              >
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { sx: { fontWeight: item.current ? 700 : 400 } } }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ flexGrow: 1, displayPrint: 'none' }}>
      <HideOnScroll>
        <AppBar
          position="fixed"
          color="default"
          elevation={0}
          sx={{
            backdropFilter: isGlass ? glassEffects.blur : 'none',
            // Glass keeps the theme's dark translucent AppBar background.
            backgroundColor: isGlass ? undefined : mode === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
            borderBottom: isGlass ? glassEffects.border : '1px solid',
            borderColor: 'divider',
            color: textColor,
          }}
        >
          <Container maxWidth="lg">
            <Toolbar disableGutters>
              <IconButton
                color="inherit"
                aria-label={t('nav.openMenu')}
                aria-expanded={mobileOpen}
                aria-controls={MOBILE_NAV_ID}
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: { xs: 1, sm: 2 }, display: { lg: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              <Box sx={{ flexGrow: 1, display: 'flex', minWidth: 0 }}>
                {/* Smaller and tighter on phones, so the menu, logo and both selectors fit at 320px. */}
                <Typography
                  variant="h6"
                  component={RouterLink}
                  to={homePath}
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: 'clamp(0.875rem, 4.2vw, 1rem)', sm: '1.25rem' },
                    letterSpacing: { xs: '.05rem', sm: '.1rem' },
                    color: textColor,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Brand logoText={profile.logoText} />
                </Typography>
              </Box>
              <Box
                component="nav"
                aria-label={t('nav.main')}
                sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1, alignItems: 'center' }}
              >
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    component={RouterLink}
                    nativeButton={false}
                    to={item.path}
                    aria-current={item.current ? 'page' : undefined}
                    sx={{
                      color: item.current ? 'primary.main' : textColor,
                      fontWeight: item.current ? 700 : 500,
                      fontSize: '0.95rem',
                      textTransform: 'none',
                      minWidth: 'auto',
                      px: 1.5,
                      whiteSpace: 'nowrap',
                      // Not only colour marks the current page.
                      ...(item.current && {
                        textDecoration: 'underline',
                        textDecorationThickness: '2px',
                        textUnderlineOffset: '6px',
                      }),
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
              <Box sx={{ ml: { xs: 1, sm: 2 }, display: 'flex', gap: { xs: 0.5, sm: 1.5 }, alignItems: 'center' }}>
                <LanguageSelector />
                <ThemeSelector />
              </Box>
            </Toolbar>
          </Container>
        </AppBar>
      </HideOnScroll>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
          // Release background ARIA hiding when focus returns, while Slide finishes closing.
          closeAfterTransition: false,
        }}
        slotProps={{ paper: { id: MOBILE_NAV_ID, 'aria-label': t('nav.menu') } }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        {drawer}
      </Drawer>
      <Toolbar />
    </Box>
  )
}

export default Navbar
