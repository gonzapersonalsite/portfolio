---
title: Rutas localizadas por idioma (raíz en español y /en en inglés) y shells HTML estáticos
state: confirmed
date: 2026-10-20
phase: F2
---
**Las rutas en español viven en la raíz (inicio (/) y `/<página>`, idioma por defecto
`es`) y las rutas en inglés bajo `/en` (`/en` y `/en/<página>`), sincronizadas
con el idioma activo y servidas por sus propios shells HTML estáticos.** Elegido
y aprobado por el dueño en `F2.1` para alinear el esquema de URLs con el resto
del ecosistema web (`gonzaloapps-site` en `gonzaloapps.es` y `kanban-board-app`):

- **Esquema de URLs con raíz en español (`x-default`) y prefijo `/en` en inglés:**
  las seis páginas en español mantienen las rutas raíz (inicio (/), `/about`,
  `/skills`, `/experience`, `/projects`, `/contact`) y las páginas en inglés
  viven bajo `/en` (`/en`, `/en/about`, `/en/skills`, `/en/experience`,
  `/en/projects`, `/en/contact`), derivadas de `APP_ROUTES` mediante
  `localizedPath` y `pathnameLanguage` en `frontend/src/shared/config/routes.ts`.
- **Sincronización bidireccional URL ↔ idioma sin recarga:** `resolveInitialLanguage`
  (`frontend/src/shared/config/language.ts`) resuelve `?lang=es|en` > prefijo
  `/en` en la ruta > `localStorage` > `navigator.language` > `'es'`
  (`DEFAULT_LANGUAGE`). En
  `frontend/src/features/language-switch/ui/LanguageProvider.tsx`, cambiar el
  idioma o arrancar con inglés detectado sincroniza la URL hacia la ruta del
  idioma activo (`/about` ↔ `/en/about`), navegar a una ruta `/en/...` activa
  `'en'`, y `?lang=es|en` sigue admitiéndose como override explícito que guarda
  la preferencia y limpia el parámetro hacia la ruta localizada.
- **Preservación de scroll y foco al cambiar de idioma:** `useRouteChangeFocus`
  (`frontend/src/app/layouts/lib/useRouteChangeFocus.ts`) compara la ruta
  canónica (`findAppRoute(pathname)?.path ?? pathname`), de modo que alternar
  entre `/about` y `/en/about` no desplaza la página arriba ni mueve el foco a
  `<main>`.
- **Shells HTML estáticos, metadatos Open Graph y `hreflang` simétricos:**
  `frontend/tooling/agent-files/` emite shells tanto en español en la raíz
  (`frontend/dist/index.html`, `frontend/dist/<página>/index.html`, con
  `<html lang="es">`, `seo.es.*`, `og:locale="es_ES"` y
  `aria-label="Cargando portafolio"`) como en inglés bajo `/en`
  (`frontend/dist/en/index.html`, `frontend/dist/en/<página>/index.html`, con
  `<html lang="en">`, `seo.en.*`, `og:locale="en_US"` y
  `aria-label="Loading portfolio"`), con `canonical` propio, alternates HTML
  (`hreflang="en"`, `"es"`, `"x-default"` apuntando a la ruta raíz en español),
  alternates Markdown y bloque `<noscript>`, además de incluir las 12 URLs en
  `sitemap.xml` y actualizarlas en vivo desde `useCanonicalLinks`
  (`frontend/src/app/layouts/lib/useCanonicalLinks.ts`).

## Refutación

- **Evidencia en contra:** mantener un único juego de URLs raíz o dejar el
  inglés en la raíz (inicio (/)) y el español bajo `/es` habría evitado invertir el
  prefijo respecto al estado inicial del portafolio.
- **Lo que se mantiene y por qué:** en un sitio estático sin middleware de
  servidor, una query string `?lang=` sirve siempre el mismo fichero HTML a los
  crawlers de redes sociales y buscadores (WhatsApp, LinkedIn, X, Googlebot), y
  unificar el español como idioma raíz (inicio (/) = `es`, `/en` = `en`) alinea el
  portafolio con `gonzaloapps.es` (`gonzaloapps-site`), las fichas de Google Play
  Console y Microsoft Partner Center y el resto de aplicaciones web multilingües
  del dueño sin requerir rewrites en `frontend/vercel.json`.
