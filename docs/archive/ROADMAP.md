# Archivo del plan del producto — fases cerradas (CERRADO)

Los cuerpos de las fases ya DONE. **Este documento no gobierna nada**: se lee
para saber qué trajo una fase y con qué criterio se cerró, nunca para decidir
trabajo futuro. Manda `../ROADMAP.md`, donde cada fase conserva su cabecera, su
marcador y la lápida que apunta aquí. Solo crece por el final.

## F0 — Línea base del portafolio estático bilingüe (DONE)

- **Alcance:** aplicación web de portafolio estático bilingüe (inglés y español)
  en `../../frontend/` con tres temas visuales (`light`, `dark`, `glass`),
  modelo de contenido en JSON estático con tests de integridad, galería
  interactiva de proyectos, formulario de contacto vía EmailJS y generación en
  build de páginas HTML por ruta, gemelos Markdown bilingües y ficheros para
  agentes (llms.txt, robots.txt, sitemap.xml).
- **Gobernanza:** los límites de Feature-Sliced Design viven en
  `../ARCHITECTURE.md` y los hacen cumplir `../../frontend/eslint.config.js` y
  `../../frontend/eslint-fsd-gaps.js`.
- **Línea base de adopción:** producto existente adoptado bajo el andamio
  compartido y el stack `react-fsd` en
  `#this-repository-uses-the-agentic-scaffold` y verificado en
  `#2026-10-18-adopt-agentic-scaffold-and-react-fsd`. No hay ninguna fase de
  producto abierta actualmente.

## F1 — Escena del duende pixelado en el hero de Inicio (DONE)

- **F1.1 — Duende pixelado sobre la tarjeta del hero de Inicio — DONE.**
  Personaje y animación de `gonzapersonalsite` integrados sobre el borde
  superior de la tarjeta del hero, sincronizados con su oscilación vertical y
  con pose de reposo al pausar o reducir el movimiento
  (`#hero-card-hosts-the-profile-pixel-goblin`,
  `#hero-goblin-scene-and-resting-pose`,
  `#2026-10-19-hero-card-pixel-goblin`).
- **F1.2 — Portales pixel 2D de entrada/salida y reutilización en Contacto — DONE.**
  Portales laterales de perfil que abren y cierran al paso del duende con
  recorte `<clipPath>`, y traslado del slice a
  `../../frontend/src/widgets/pixel-goblin/` para compartirlo sin duplicación
  entre la tarjeta del hero de Inicio y el panel del formulario de Contacto
  (`#pixel-goblin-portals-and-contact-panel`,
  `#2026-10-19-pixel-goblin-portals-and-contact-panel`).

## F2 — Rutas y shells HTML localizados por idioma (raíz en español y /en en inglés) (DONE)

- **F2.1 — Rutas raíz en español, subrutas `/en` en inglés, sincronización URL ↔ idioma y shells HTML estáticos por idioma — DONE.**
  Rutas raíz (inicio (/) y `/<página>`) en español (`DEFAULT_LANGUAGE = 'es'`) y
  subrutas `/en` (`/en` y `/en/<página>`) en inglés sincronizadas con
  `LanguageProvider` y el selector de idioma sin perder scroll ni foco, enlaces
  internos localizados y emisión en build de shells HTML en español
  (`../../frontend/dist/`) y en inglés (`../../frontend/dist/en/`) con metadatos
  Open Graph (`seo.es.*` / `seo.en.*`, `og:locale`), alternates HTML `hreflang`
  (`en`, `es`, `x-default` apuntando a la raíz en español) y entradas en
  `sitemap.xml` (`#localized-spanish-routes-and-shells`,
  `#2026-10-20-localized-spanish-routes-and-shells`).

## F3 — Rediseño visual («Mesa de Taller») y retirada incremental de Material UI (DONE)

- **F3.1 — Galería nativa de proyectos — DONE.** Integración de `ProjectGallery` sobre `<dialog>` nativo con estilos propios y cero dependencias de Material UI o Emotion en `../../frontend/src/entities/project/ui/` (`#visual-redesign-workbench-two-themes`, `#2026-11-25-native-dialog-project-gallery`).
- **F3.2 — Migración completa de `frontend/src/` a «Mesa de Taller» sin Material UI — DONE.** Tokens claro/oscuro (`tokens.css`) con respaldo pasivo ante `glass`, controles directos HTML de idioma y tema/animaciones (opción 2), cajón móvil nativo sobre `<dialog>`, tarjetas `Vista`/`Arquitectura`, skills con ejemplos aplicados, formulario y avisos propios (`#2026-11-25-mesa-de-taller-redesign-and-mui-source-removal`).
- **F3.3 — Identidad visual («Mesa de Taller» en favicon y tarjeta social), ajuste tipográfico y retirada de dependencias MUI/Emotion — DONE.** Iconos `g-workbench.*` y tarjeta social `frontend/public/og-cover-mesa-taller-gonzalo-martinez.jpg` alineados con «Mesa de Taller» (`#icon-keeps-the-g-monogram-dot`, `#github-social-preview-is-a-tolerated-copy`), rasgos OpenType técnicos de `Inter Variable` y cifras tabulares en `frontend/src/app/styles/index.css` (`#workbench-type-is-self-hosted-inter-with-technical-features`) y retirada definitiva de `@mui/*` y `@emotion/*` en `frontend/package.json` y `frontend/pnpm-lock.yaml` (`#2026-11-25-workbench-branding-and-mui-package-removal`).
- **F3.4 — Revisión transversal y acabado de «Mesa de Taller» — DONE.** Textos de toda la web contrastados con los repositorios y la experiencia real, datos JSON estrechados en su borde con tipos cerrados, esqueleto propio por página, áreas de trabajo en Inicio, enlace a Microsoft Store, alt social por idioma e impresión sin controles (`#2026-11-26-workbench-cross-review-and-finish`).
- **Cierre:** el dueño dio por buena la revisión visual de las superficies actualizadas y confirmó la tipografía (`#workbench-type-is-self-hosted-inter-with-technical-features`, `#2026-11-26-f3-closed-with-the-typeface-confirmed`).
