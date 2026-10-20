---
title: Rutas y shells HTML localizados por idioma (raíz en español y /en en inglés)
date: 2026-10-20
phase: F2
---
**Objetivo y dueño:** producto; parte `F2.1` de `F2`. Decisión:
`#localized-spanish-routes-and-shells`.

**Qué cambió.**
- `frontend/src/shared/config/routes.ts`, `frontend/src/shared/config/index.ts`,
  `frontend/src/shared/config/language.ts`, `frontend/src/shared/config/i18n.ts`
  y sus tests (`routes.test.ts`, `language.test.ts`): añadidos `pathnameLanguage`
  y `localizedPath`, soporte de rutas `/en` en `findAppRoute`, `DEFAULT_LANGUAGE = 'es'`
  y prioridad `?lang=` > ruta `/en` > `localStorage` > `navigator.language` > `'es'`
  en `resolveInitialLanguage`.
- `frontend/src/features/language-switch/ui/LanguageProvider.tsx`,
  `frontend/src/app/routing/AppRouter.tsx`,
  `frontend/src/app/layouts/lib/useRouteChangeFocus.ts`,
  `frontend/src/app/layouts/lib/useCanonicalLinks.ts`,
  `frontend/src/widgets/navbar/ui/Navbar.tsx`,
  `frontend/src/pages/home/ui/HomePage.tsx`,
  `frontend/src/shared/ui/ErrorBoundary.tsx` y sus tests: sincronización
  bidireccional entre idioma activo y ruta (raíz en español ↔ `/en` en inglés),
  preservación de scroll y foco al cambiar de idioma en la misma página, enlaces
  internos localizados y actualización dinámica de `canonical`, `og:url`,
  `og:locale` y alternates HTML `hreflang="en|es|x-default"` (`x-default` en la
  raíz española).
- `frontend/index.html` y `frontend/tooling/agent-files/` (`routes.ts`, `shell.ts`,
  `vitePlugin.ts`, `sitemap.ts`, `generate.ts` y sus tests): metadatos `meta.es` y
  `meta.en` desde `seo.es` y `seo.en`, `frontend/index.html` con español como base
  de desarrollo (`lang="es"`, `og:locale="es_ES"`, `aria-label="Cargando portafolio"`
  y registro de `stack:react-fsd` en el commit `27df3cf` de `templates`), emisión de shells estáticos en español en la raíz
  (`frontend/dist/index.html` y `frontend/dist/<ruta>/index.html`) y en inglés
  bajo `/en` (`frontend/dist/en/index.html` y `frontend/dist/en/<ruta>/index.html`)
  con `<html lang>`, `og:locale`, `aria-label` del indicador de arranque por
  idioma, alternates HTML `hreflang` (`en`, `es`, `x-default`) y las 12 URLs en
  `sitemap.xml`.
- `.agents/skills/portfolio-conventions/SKILL.md`, `README.md`,
  `docs/es/README.md`, `ARCHITECTURE.md`, `docs/es/ARCHITECTURE.md`,
  `OPERATIONS.md`, `docs/es/OPERATIONS.md`, `docs/ROADMAP.md` y
  `docs/archive/ROADMAP.md`: documentación y plan actualizados.

**Cómo se verificó.** Se inyectó un defecto ejecutable en `localizedPath`
(`frontend/src/shared/config/routes.ts`, devolviendo `path` sin prefijo `/en`),
viendo fallar `routes.test.ts`, `LanguageSelector.test.tsx` y `shell.test.ts`, y
se revirtió con la edición inversa. `python verify.py` arrancó en verde (`9 puertas, 0 en rojo`)
y cerró en verde (`9 puertas, 0 en rojo`, 190 tests en 39 archivos).

**Pendiente.** Nada; `F2` queda cerrada.
