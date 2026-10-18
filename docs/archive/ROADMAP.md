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
