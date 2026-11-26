---
title: Migración completa de frontend/src a Mesa de Taller sin Material UI
date: 2026-11-25
phase: F3
---
**Objetivo y dueño:** producto; parte 2 de `F3` (`F3.2`), continuando la
implementación en la rama `feat/f3-visual-redesign` y su worktree separado por
indicación del dueño («Vale pue sigue con la implementacion» y «sigue y
termina»). Decisiones: `#visual-redesign-workbench-two-themes`,
`#mui-full-removal-incremental-parts` y
`#choices-of-look-wait-for-the-visual-redesign`.

**Qué cambió.**

- `frontend/src/app/styles/tokens.css`, `frontend/src/app/styles/index.css`,
  `frontend/index.html` y `frontend/vercel.json`: sistema de tokens
  claro/oscuro (`--bg` y `--accent` claro/oscuro en `tokens.css`), script de
  prepintado sin `glass`, nuevo hash CSP en `vercel.json`, retícula de mesa de
  trabajo, primitivas `.wb-*`, reglas a `320 px` (`19.99em`) y `@media print`
  uniforme en blanco y negro.
- `frontend/src/shared/config/theme.ts`, `frontend/src/shared/config/i18n.ts`,
  `frontend/src/shared/ui/` y retirada de `glassStyles.ts` y `formatPercent`:
  respaldo pasivo de `resolveStoredColorMode` cuando `localStorage` guarda
  `glass`, iconos SVG propios en `em`, esqueletos CSS y primitivos semánticos.
- `frontend/src/features/` (`theme-switch`, `language-switch`, `notifications`,
  `contact-form`): controles directos HTML de tema, animaciones (`aria-disabled`
  bajo movimiento reducido) e idioma (opción 2), región accesible
  `role="alert"` y formulario nativo manteniendo foco y `readOnly` durante el
  envío.
- `frontend/src/widgets/` (`navbar`, `footer`, `pixel-goblin`): cajón móvil
  nativo sobre `<dialog>` con `showModal()`, `closedby="any"`, retorno de foco
  y simplificación de la cabecera móvil para evitar solape con la marca; bahía
  dedicada para `PixelGoblin` y pie de página semántico.
- `frontend/src/entities/` (`project`, `skill`), `frontend/src/pages/` y
  `frontend/tooling/agent-files/twins.ts`: las 7 páginas migradas sin imports
  de `@mui/*` ni `@emotion/*` en `frontend/src/`, tarjetas con conmutador
  `Vista`/`Arquitectura` (`architectureEn`/`architectureEs`) y ejemplos reales
  (`appliedEn`/`appliedEs`) en habilidades y gemelos Markdown.
- `frontend/vite.config.ts`, `frontend/vitest.config.ts`, documentación viva
  (`README.md`, `DESIGN.md`, `ARCHITECTURE.md`, `OPERATIONS.md`, copias en
  `docs/`, skill `portfolio-conventions`) y decisiones del registro: eliminado
  el grupo muerto `mui-vendor`, activado `css: true` en Vitest y alineada la
  documentación con `board: documents`.

**Cómo se verificó.**

- **Pruebas unitarias (`vitest run` + `vitest` con `css: true`):** todas las
  suites del repositorio en verde (`60` ficheros de test tras ajustar las
  aserciones de la nueva interfaz, `ProjectCard.test.tsx`, `Navbar.test.tsx`,
  `ThemeSelector.test.tsx`, `ThemeProvider.test.tsx`, `ProjectsPage.test.tsx`,
  `SkillsPage.test.tsx`).
- **Auditoría en navegador real (Chromium headless por CDP sobre
  `http://127.0.0.1:4173`):**
  - `84` visitas (`14` rutas × `2` temas en `1280×800`, `390×844@3`, más
    `320×640 @ 24 px` y `640×400 @ 2`) con `0` errores de consola, `0`
    peticiones fallidas (salvo `404` esperado en ruta inexistente), `0 px` de
    desbordamiento y `0` solapes en cabecera móvil.
  - Detectó y permitió corregir cuatro defectos reales: destello de contraste
    al cambiar de oscuro a claro en botones secundarios (transición de
    `background-color` sin `color`), colisión horizontal en cabecera móvil a
    `390 px`, contraste insuficiente del acento inicial en modo claro (`4,10:1`
    y `4,49:1`, elevado a `5,02:1` al oscurecer `--accent` a `rgb(178, 52, 7)`),
    y fondos oscuros dentro de tarjetas al imprimir (`@media print` actualizado
    a fondo transparente uniforme sobre papel blanco).
  - Verificados el respaldo pasivo de `themeMode = glass`, foco y `Escape` del
    cajón `<dialog>` y de `ProjectGallery`, terminal 404 (`cd projects`),
    `Vista`/`Arquitectura`, botón de animaciones bajo `prefers-reduced-motion`
    y `332` nodos accesibles nombrados en Inicio.
- **Puertas finales (`.\dev.cmd verify`):** ejecutadas sobre el árbol limpio sin
  preparar ni commitear, con resultado final verde en las 9 puertas.

**Pendiente.**

- Revisión visual del árbol sin preparar ni commitear por el dueño (`dev` activo
  en `http://127.0.0.1:5173/`).
- Decisión pendiente del dueño sobre el favicon azul actual
  (`#icon-keeps-the-g-monogram-dot`), selección/versiones de fuentes
  (`#choices-of-look-wait-for-the-visual-redesign`) y retirada definitiva de
  `@mui/*` y `@emotion/*` en `frontend/package.json` y `frontend/pnpm-lock.yaml`
  (`#mui-full-removal-incremental-parts`).
