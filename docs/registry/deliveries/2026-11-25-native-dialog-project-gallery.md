---
title: Galería nativa de proyectos sobre dialog sin Material UI
date: 2026-11-25
phase: F3
---
**Objetivo y dueño:** producto; parte 1 de `F3` (`F3.1`), encargada por el dueño en
rama `feat/f3-visual-redesign` y worktree separado de `main` para abrir la
retirada incremental de Material UI integrando primero la galería nativa sobre
`<dialog>`. Decisiones: `#visual-redesign-workbench-two-themes` y
`#mui-full-removal-incremental-parts`. Palabras del dueño: «Autorizo abrir la
fase de rediseño y ejecutar solo la primera parte, en una rama y un worktree
separados de main. El objetivo es retirar MUI por completo de forma incremental.
Quiero que la primera parte sea integrar la galería nativa en el portafolio
real».

**Qué cambió.**

- `frontend/src/entities/project/ui/ProjectGallery.tsx`: sustituye `Dialog`,
  `DialogTitle`, `Box`, `Button`, `IconButton`, `CircularProgress`, `Typography`
  y los seis iconos de Material UI / Emotion por `<dialog>` con `showModal()` y
  `closedby="any"` (más respaldo por coordenadas de puntero), iconos SVG en
  línea dimensionados en `em`, barra de progreso accesible con `role="progressbar"`,
  soporte de gesto táctil horizontal sin zoom accidental tras deslizar y retorno
  determinista del foco al botón disparador al cerrar con `Escape`, botón o
  fondo.
- `frontend/src/entities/project/ui/ProjectGallery.css`: hoja co-localizada en
  `rem`/`em` (sin tamaños tipográficos fijos en `px`), con `touch-action: pan-y`
  hasta hacer zoom y `pan-x pan-y` al ampliar, `pointer-events: none` en la capa
  superpuesta de estado salvo el botón de reintento, modo compacto bajo
  `max-height: 32em` (incluye `320×640` con letra a `24px`), respeto a
  `prefers-reduced-motion`, contorno visible en `forced-colors` y ocultación en
  `@media print`.
- `frontend/src/entities/project/ui/ProjectGallery.test.tsx`: mantiene las 12
  pruebas previas (retirando el `act` legado de ondas de MUI) y añade 3 de zoom y
  desplazamiento con flechas, deslizamiento táctil bilateral sin zoom accidental y
  cierre con retorno de foco en `cancel` y backdrop fallback (15 pruebas).
- `frontend/vite.config.ts`: ajusta el comentario del grupo `mui-vendor` al salir
  `Dialog`.
- `docs/ROADMAP.md`, `docs/registry/decisions/choices-of-look-wait-for-the-visual-redesign.md`,
  `docs/registry/decisions/visual-redesign-workbench-two-themes.md` y
  `docs/registry/decisions/mui-full-removal-incremental-parts.md`: apertura de
  `F3` y registro de las decisiones dictadas y el corte provisional siguiente.

**Cómo se verificó.**

- **Puertas de partida:** sobre `9f4ef52` en el worktree limpio tras
  `.\dev.cmd prepare`, `.\dev.cmd verify` dio `RESULT: 9 puertas, 0 en rojo` con
  443 tests.
- **Defecto reintroducido:** se fijó `SWIPE_THRESHOLD_PX` a `4800` y se anuló
  `openerRef.current` en `ProjectGallery.tsx`; `.\dev.cmd verify -- tests` falló
  con 3 casos rojos en retorno de foco tras `Escape`, `cancel`/backdrop y gesto
  táctil (`443 passed`, `3 failed`), y se revirtió con la edición inversa.
- **Navegador real (Chromium headless):**
  - En producción (`http://127.0.0.1:4173/`, `/projects/` ES claro y `/en/projects/`
    EN oscuro a `1280×800`; `/projects/` móvil `390×844@3` oscuro; y `320×640`
    con letra a `24px` claro): `overflow: 0`, consola sin errores, apertura por
    teclado (`Enter` en portada), foco inicial en cerrar, avance por teclado y
    botón, zoom a `150%` con pan sin cambiar captura, retorno a `100%` y cierre
    con `Escape` devolviendo el foco a la portada de Quotidia. En la primera
    captura a `320×640 @ 24px` se detectó colapso vertical del visor y se
    corrigió con la regla bajo `max-height: 32em`.
  - En servidor de desarrollo (`http://127.0.0.1:5173/projects`, Chromium headless
    por CDP): fallo simulado de la imagen principal de Quotidia -> estado de
    error + `Reintentar` habilitado (`aria-disabled="false"`) -> reintento manual
    tras quitar el bloqueo -> carga completada pasando el foco a `Cerrar galería` ->
    `Escape` devolviendo el foco al botón de portada; y en móvil `390×844@3` con
    toque emulado, descubrimiento de que `touch-action: pan-x pan-y` cancelaba el
    gesto horizontal con `pointercancel` y la capa superpuesta bloqueaba el
    segundo deslizamiento durante carga, corregido y verificado con deslizamiento
    bidireccional (`Imagen 1 de 9` ↔ `Imagen 2 de 9`) sin disparar zoom.
  - Pasada final de `browser_verify` tras el último cambio CSS en
    `http://127.0.0.1:5173/projects` y `/en/projects` (`1280×800`, `390×844@3` y
    `320×640 @ 24px`) antes del cierre final de puertas.
- **No se comprobó en navegador:** Safari, Firefox ni Edge; un teléfono táctil
  físico; ni un lector de pantalla. El subagente `browser` (`flash`) falló por
  límite de cuota (`429`) al abrir `http://127.0.0.1:5173/`, que quedó en marcha
  en el contenedor de desarrollo del worktree.

**Pendiente.**

- Revisión del diff sin preparar ni commitear y elección de la siguiente parte de
  `F3` (`#mui-full-removal-incremental-parts`) junto con la revisión aparte de
  fuentes y versiones (`#choices-of-look-wait-for-the-visual-redesign`).
