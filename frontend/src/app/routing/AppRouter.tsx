import React, { Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, Container } from '@mui/material'
import { PublicLayout } from '../layouts'
import { APP_ROUTES, localizedPath, type Language, type RouteId } from '@/shared/config'
import {
  HeroSkeleton,
  PageHeaderSkeleton,
  SkillsSkeleton,
  ExperienceSkeleton,
  ProjectGridSkeleton,
  AboutSkeleton,
  ContactSkeleton,
} from '@/shared/ui'

type PageModule = { default: React.ComponentType }

// Each page chunk is loaded from one place: React.lazy renders it and the idle prefetch warms it.
const PAGE_LOADERS: Record<RouteId, () => Promise<PageModule>> = {
  home: () => import('@/pages/home'),
  about: () => import('@/pages/about'),
  skills: () => import('@/pages/skills'),
  experience: () => import('@/pages/experience'),
  projects: () => import('@/pages/projects'),
  contact: () => import('@/pages/contact'),
}

const PageLoader = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ py: 8 }}>
    <Container maxWidth="lg">
      <PageHeaderSkeleton />
      {children}
    </Container>
  </Box>
)

const PAGE_SKELETONS: Record<RouteId, React.ReactNode> = {
  home: <HeroSkeleton />,
  about: (
    <PageLoader>
      <AboutSkeleton />
    </PageLoader>
  ),
  skills: (
    <PageLoader>
      <SkillsSkeleton />
    </PageLoader>
  ),
  experience: (
    <PageLoader>
      <ExperienceSkeleton />
    </PageLoader>
  ),
  projects: (
    <PageLoader>
      <ProjectGridSkeleton />
    </PageLoader>
  ),
  contact: (
    <PageLoader>
      <ContactSkeleton />
    </PageLoader>
  ),
}

const PAGES = APP_ROUTES.map((route) => ({ ...route, Page: React.lazy(PAGE_LOADERS[route.id]) }))

// Warm the lazy page chunks while the browser is idle so navigation feels instant.
function usePrefetchPages() {
  useEffect(() => {
    let cancelled = false
    const run = () => {
      if (!cancelled) {
        APP_ROUTES.forEach(({ id, path }) => {
          void PAGE_LOADERS[id]().catch((error: unknown) => {
            // A speculative failure must not interrupt the current page. Navigation
            // still uses React.lazy, which sends a load failure to the error boundary.
            console.warn({ event: 'page-prefetch-failed', route: path, error })
          })
        })
      }
    }

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4000 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }

    const timer = window.setTimeout(run, 2000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])
}

const renderRoutes = (language: Language) =>
  PAGES.map(({ id, path, Page }) => {
    const element = (
      <Suspense fallback={PAGE_SKELETONS[id]}>
        <Page />
      </Suspense>
    )
    const routePath = localizedPath(path, language)
    return routePath === '/' ? (
      <Route key={`${language}-${id}`} index element={element} />
    ) : (
      <Route key={`${language}-${id}`} path={routePath} element={element} />
    )
  })

export default function AppRouter() {
  usePrefetchPages()

  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        {renderRoutes('en')}
        {renderRoutes('es')}
      </Route>

      <Route path="/es/*" element={<Navigate to="/es" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
