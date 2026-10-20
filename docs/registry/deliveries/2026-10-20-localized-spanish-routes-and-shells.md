---
title: Rutas y shells HTML localizados en español bajo /es
date: 2026-10-20
phase: F2
---
**Objetivo y dueño:** producto; parte `F2.1` de `F2`. Decisión:
`#localized-spanish-routes-and-shells`.

**Qué cambió.**
- `frontend/src/shared/config/routes.ts`, `frontend/src/shared/config/index.ts`,
  `frontend/src/shared/config/language.ts`, `frontend/src/shared/config/i18n.ts`
  y sus tests (`routes.test.ts`, `language.test.ts`): añadidos `pathnameLanguage`
  y `localizedPath`, soporte de rutas `/es` en `findAppRoute`, y prioridad
  `?lang=` > ruta `/es` > `localStorage` > `navigator.language` > `'en'` en
  `resolveInitialLanguage`.
- `frontend/src/features/language-switch/ui/LanguageProvider.tsx`,
  `frontend/src/app/routing/AppRouter.tsx`,
  `frontend/src/app/layouts/lib/useRouteChangeFocus.ts`,
  `frontend/src/app/layouts/lib/useCanonicalLinks.ts`,
  `frontend/src/widgets/navbar/ui/Navbar.tsx`,
  `frontend/src/pages/home/ui/HomePage.tsx`,
  `frontend/src/shared/ui/ErrorBoundary.tsx` y sus tests: sincronización
  bidireccional entre idioma activo y ruta (raíz ↔ `/es`), preservación de scroll
  y foco al cambiar de idioma en la misma página, enlaces internos localizados y
  actualización dinámica de `canonical`, `og:url`, `og:locale` y alternates HTML
  `hreflang="en|es|x-default"`.
- `frontend/tooling/agent-files/` (`routes.ts`, `shell.ts`, `vitePlugin.ts`,
  `sitemap.ts`, `generate.ts` y sus tests): metadatos `meta.es` desde `seo.es`,
  emisión de shells estáticos en `frontend/dist/es/index.html` y
  `frontend/dist/es/<ruta>/index.html` con `<html lang="es">`,
  `og:locale="es_ES"`, `aria-label="Cargando portafolio"`, alternates HTML
  `hreflang` (`en`, `es`, `x-default`) y las 12 URLs en `sitemap.xml`.
- `.agents/skills/portfolio-conventions/SKILL.md`, `README.md`,
  `docs/es/README.md`, `ARCHITECTURE.md`, `docs/es/ARCHITECTURE.md`,
  `OPERATIONS.md`, `docs/es/OPERATIONS.md`, `docs/ROADMAP.md` y
  `docs/archive/ROADMAP.md`: documentación y plan actualizados.

**Cómo se verificó.** Se inyectó un defecto ejecutable en `localizedPath`
(`frontend/src/shared/config/routes.ts`, devolviendo `path` sin prefijo `/es`),
viendo fallar `routes.test.ts`, `LanguageSelector.test.tsx` y `shell.test.ts`, y
se revirtió con la edición inversa. `python verify.py` arrancó en verde sobre
`0a99aca` (`9 puertas, 0 en rojo`) y cerró en verde (`9 puertas, 0 en rojo`,
190 tests en 39 archivos).

**Pendiente.** Nada; `F2` queda cerrada.
