# Archivo del plan del producto — fases cerradas (CERRADO)

Los cuerpos de las fases ya DONE. **Este documento no gobierna nada**: se lee
para saber qué trajo una fase y con qué criterio se cerró, nunca para decidir
trabajo futuro. Manda `../ROADMAP.md`, donde cada fase conserva su cabecera, su
marcador y la lápida que apunta aquí. Solo crece por el final.

## F0 — Existing static bilingual portfolio baseline (DONE)

- **Scope:** Static bilingual (English and Spanish) portfolio application in
  `../../frontend/` with three visual themes (`light`, `dark`, `glass`), static
  JSON content model with integrity tests, interactive project gallery, contact
  form via EmailJS, and build-time per-route HTML shells, bilingual Markdown
  twins, and agent-readable files (llms.txt, robots.txt, sitemap.xml).
- **Governance:** Feature-Sliced Design boundaries are defined in
  `../ARCHITECTURE.md` and enforced by `../../frontend/eslint.config.js` and
  `../../frontend/eslint-fsd-gaps.js`.
- **Adoption baseline:** existing product adopted under the shared scaffold and
  `react-fsd` stack at `#this-repository-uses-the-agentic-scaffold` and
  verified in `#2026-10-18-adopt-agentic-scaffold-and-react-fsd`. No next
  product phase is currently open.
