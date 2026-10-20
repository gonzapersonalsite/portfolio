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

## F2 — Rutas y shells HTML localizados en español bajo /es (DONE)

- **F2.1 — Subrutas `/es`, sincronización URL ↔ idioma y shells HTML estáticos en español — DONE.**
  Rutas `/es` y `/es/<página>` sincronizadas con `LanguageProvider` y el
  selector de idioma sin perder scroll ni foco, enlaces internos localizados y
  emisión en build de shells HTML en español (`../../frontend/dist/es/`) con
  metadatos Open Graph (`seo.es.*`, `og:locale="es_ES"`), alternates HTML
  `hreflang` (`en`, `es`, `x-default`) y entradas en `sitemap.xml`
  (`#localized-spanish-routes-and-shells`,
  `#2026-10-20-localized-spanish-routes-and-shells`).
