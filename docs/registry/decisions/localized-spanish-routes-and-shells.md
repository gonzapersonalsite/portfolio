---
title: Rutas localizadas en español bajo /es y shells HTML estáticos por idioma
state: confirmed
date: 2026-10-20
phase: F2
---
**Las rutas en español viven bajo `/es` (`/es` y `/es/<página>`), sincronizadas
con el idioma activo y servidas por sus propios shells HTML estáticos.** Elegido
y aprobado por el dueño tras revisar el plan de acción en `F2.1`:

- **Esquema de URLs con prefijo `/es` y raíz en inglés (`x-default`):** las seis
  páginas en inglés mantienen sus rutas raíz (inicio (/), `/about`, `/skills`,
  `/experience`, `/projects`, `/contact`) y las páginas en español viven bajo
  `/es` (`/es`, `/es/about`, `/es/skills`, `/es/experience`, `/es/projects`,
  `/es/contact`), derivadas de `APP_ROUTES` mediante `localizedPath` y
  `pathnameLanguage` en `frontend/src/shared/config/routes.ts`.
- **Sincronización bidireccional URL ↔ idioma sin recarga:** `resolveInitialLanguage`
  (`frontend/src/shared/config/language.ts`) resuelve `?lang=es|en` > prefijo
  `/es` en la ruta > `localStorage` > `navigator.language` > `'en'`. En
  `frontend/src/features/language-switch/ui/LanguageProvider.tsx`, cambiar el
  idioma o arrancar con español detectado sincroniza la URL hacia la ruta del
  idioma activo (`/about` ↔ `/es/about`), navegar a una ruta `/es/...` activa
  `'es'`, y `?lang=es|en` sigue admitiéndose como override explícito que guarda
  la preferencia y limpia el parámetro hacia la ruta localizada.
- **Preservación de scroll y foco al cambiar de idioma:** `useRouteChangeFocus`
  (`frontend/src/app/layouts/lib/useRouteChangeFocus.ts`) compara la ruta
  canónica (`findAppRoute(pathname)?.path ?? pathname`), de modo que alternar
  entre `/about` y `/es/about` no desplaza la página arriba ni mueve el foco a
  `<main>`.
- **Shells HTML estáticos, metadatos Open Graph y `hreflang` simétricos:**
  `frontend/tooling/agent-files/` emite shells tanto en inglés
  (`frontend/dist/index.html`, `frontend/dist/<página>/index.html`) como en
  español (`frontend/dist/es/index.html`, `frontend/dist/es/<página>/index.html`)
  con `<html lang="es">`, `seo.es.*`, `og:locale="es_ES"`, `canonical` propio,
  alternates HTML (`hreflang="en"`, `"es"`, `"x-default"`), alternates Markdown y
  bloque `<noscript>` en español, además de incluir las 12 URLs en `sitemap.xml`
  y actualizarlas en vivo desde `useCanonicalLinks`
  (`frontend/src/app/layouts/lib/useCanonicalLinks.ts`).

## Refutación

- **Evidencia en contra:** mantener un único juego de URLs raíz y sincronizar
  `?lang=es` en la barra de direcciones habría evitado duplicar las rutas en
  `AppRouter` y emitir los seis shells HTML bajo `frontend/dist/es/`.
- **Lo que se mantiene y por qué:** en un sitio estático sin middleware de
  servidor, una query string `?lang=es` sirve siempre el mismo fichero HTML en
  inglés a los crawlers de redes sociales y buscadores (WhatsApp, LinkedIn, X,
  Googlebot), que ignoran el parámetro o leen `link[rel="canonical"]` en inglés;
  las subrutas estáticas `/es/...` con su propio `index.html` permiten compartir
  la URL directamente desde la barra de direcciones o el menú nativo del móvil y
  entregar la vista previa Open Graph e indexación en español sin tocar
  `frontend/vercel.json`.
