---
title: Identidad Mesa de Taller en favicon y tarjeta social y retirada de MUI
date: 2026-11-25
phase: F3
---
**Objetivo y dueño:** producto; parte 3 de `F3` (`F3.3`), autorizada explícitamente
por el dueño tras revisar `F3.2` («Déjalo como toca, pues con los cambios que
hiciste el actual no encaja... el branding entero cambio, favicon, social org...»,
«Yo desinstalaría ya MUI... y de fuentes te dejo elegir lo que encaje mejor»).
Decisiones aplicadas: `#icon-keeps-the-g-monogram-dot`,
`#visual-redesign-workbench-two-themes` y `#github-social-preview-is-a-tolerated-copy`.
Decisiones retiradas como aplicadas en `docs/registry/retired.txt`:
`#mui-full-removal-incremental-parts` y `#choices-of-look-wait-for-the-visual-redesign`.

**Qué cambió.**

- **Iconos de marca «Mesa de Taller» (`frontend/public/icons/g-workbench.*`):**
  generados `g-workbench.svg`, `g-workbench.ico` (`4031 B`, tamaños `16×16`,
  `32×32` y `48×48` por CDP) y `g-workbench-180.png` (`4425 B`, `180×180`
  opaco a sangre completa), alineando `BrandMarkIcon` en
  `frontend/src/shared/ui/Icons.tsx` y eliminando los anteriores
  `g-monogram.*` por caché inmutable de un año.
- **Vista previa social OG (`frontend/tooling/og-cover/og-cover.html`):**
  rediseñada la tarjeta `1200×630` con fondo carbón, retícula técnica, ficha
  elevada, esquinas de registro naranjas y composición tipográfica centrada en
  `630×630`, exportada como `frontend/public/og-cover-mesa-taller-gonzalo-martinez.jpg`
  (`42667 B`, JPEG calidad `85`) y retirada `og-cover-gonzalo-martinez-full-stack.jpg`.
- **Metadatos HTML (`frontend/index.html`):** actualizados `og:image`,
  `twitter:image`, `og:image:alt`, `twitter:image:alt` y los `<link>` a
  `g-workbench.*` sin modificar el script inline de prepintado ni su hash CSP.
- **Ajuste tipográfico sin añadir dependencias externas:** se mantiene fijado
  `@fontsource-variable/inter` (`5.3.0`, requerido por `vite-plugin-font-preload`
  y por la política de confirmación explícita para nuevas dependencias) y se
  activan rasgos técnicos (`cv02`, `cv03`, `cv04`, `cv11`), ajuste óptico y
  cifras tabulares en `.wb-eyebrow`, `.wb-chip` y `time` dentro de
  `frontend/src/app/styles/index.css` (más comentario actualizado en
  `tokens.css`).
- **Retirada total de MUI/Emotion (`frontend/package.json` y
  `frontend/pnpm-lock.yaml`):** desinstalados con `pnpm remove --ignore-scripts`
  los 5 paquetes directos (`@emotion/react`, `@emotion/styled`,
  `@mui/icons-material`, `@mui/lab`, `@mui/material`, `-59` paquetes en el
  árbol) y limpiada la descripción del paquete; las reglas preventivas en
  `frontend/eslint.config.js` y `frontend/eslint.config.test.ts` se conservan.
- **Documentación, skill y registro:** actualizados `DESIGN.md`, `OPERATIONS.md`,
  `docs/es/OPERATIONS.md`, `ARCHITECTURE.md`, `docs/es/ARCHITECTURE.md`,
  `docs/ARCHITECTURE.md`, `README.md`, `docs/es/README.md`,
  `.agents/skills/portfolio-conventions/SKILL.md`, `docs/ROADMAP.md` y el libro
  `docs/registry/retired.txt`.

**Cómo se verificó.**

- **Pruebas previas pendientes de cierre final:** se actualizará tras completar la
  verificación final en Chrome headless y las 9 puertas de `.\dev.cmd verify`.

**Pendiente.**

- Revisión visual final por el dueño en `http://127.0.0.1:5173/` y confirmación
  para cerrar y archivar `F3` (árbol sin preparar ni commitear).
- Pasos manuales tras desplegar en GitHub y redes (`OPERATIONS.md`,
  `#github-social-preview-is-a-tolerated-copy`): subir
  `og-cover-mesa-taller-gonzalo-martinez.jpg` en *Social preview* del repo y
  refrescar LinkedIn/Facebook.
