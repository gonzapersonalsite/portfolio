---
title: Actualización a agentic-scaffold 0.8.1 y auditoría sobre el árbol de trabajo
date: 2026-11-24
phase: none
---
**Objetivo y dueño:** herramientas de desarrollo; mantenimiento del andamio
encargado por el dueño para dejar cada repositorio consumidor en consonancia
con su plantilla. Lleva el motor de 0.7.0 (commit `d086d1e` del catálogo, la
entrega `#2026-11-22-scaffold-upgrade-to-0-7-0`) a 0.8.1 (commit `80d58c7`),
con los componentes `layer:react-vite` y `stack:react-fsd` registrados en
`d086d1e`, cuyas piezas el catálogo no cambió. No abre ni cierra ninguna fase
ni tramo, y no toca nada bajo `frontend/` ni del despliegue. Palabras del
dueño en el encargo: «Lanza un sub-agente por proyecto que remedie de forma
correcta y deje actualizado y commit y push en cada repo final».

**Qué cambió.**

- **Lo que tomó la herramienta (plan `d8f8531c1497`, sin rechazos ni
  conflictos):** `docs/ACTUALIZAR.md`, `tools/board/components.py`,
  `tools/board/instantiate.py` y `tools/board/test_board.py`, que la plantilla
  cambió y la instancia no; reescribió `tools/board/MANIFEST.txt` (versión
  0.8.1 y los cuatro sellos) y `tools/board/components.txt` (la leyenda gana
  la clave `delivered` y `applied` pasa a `80d58c7`). Otros 23 ficheros del
  motor estaban al día: no se añadió ni se quitó ninguno.
- **Componentes, con la aplicación en `frontend/`:** de `layer:react-vite`,
  22 piezas y líneas al día y la skill `react-fsd-maintainer` con su parche
  local. De `stack:react-fsd`, dos al día (`tools/install-pnpm.py` y
  `tools/stack.txt`); se dejaron con su parche local, porque la plantilla no
  las cambió, las cinco que la entrega de 0.7.0 adaptó a la subcarpeta o al
  producto (`.dockerignore`, `Dockerfile`, `compose.yaml`, `tools/react.sh` y
  `docs/ARCHITECTURE.md`); y siguen siendo del producto (`kept`) las 16 que
  viven bajo `frontend/` (el ESLint propio, el cliente HTTP, el generador de
  archivos para agentes y la preparación de Vitest). Los dos componentes
  siguen registrados en `d086d1e`.
- **Qué trae el motor:** 0.8.0 enseña a `instantiate.py` y a `components.py`
  las guías que un starter entrega como documento del producto; 0.8.1 corrige
  la lectura de `root = true` al fusionar un `.editorconfig`. Ninguna de las
  dos cosas escribe nada en una instancia ya creada.
- **Conciliado a mano y cerrado con `--done`, los dos pendientes del plan:**
  - `AGENTS.md`, regla dura 3. El párrafo de la instancia era el del andamio
    0.7.0 sin adaptar, así que queda como el de 0.8.1: la auditoría es del
    árbol de trabajo (`git status --short`, `git diff` y cada fichero nuevo
    entero), el trabajo verificado se deja sin preparar, y preparar con
    `git add` es parte de commitear, con la autorización y confirmado por
    `git diff --cached --stat`. Lo propio del contrato no se tocó y sigue
    siendo la única diferencia con el de 0.8.1: la línea roja de los scripts
    de dependencias con `frontend/pnpm-workspace.yaml`, las seis viñetas del
    §3, la fila de `docs/ARCHITECTURE.md` en el §4, la redacción de «Verde» en
    el §8 y las líneas de `portfolio-conventions` y `react-fsd-maintainer` en
    el §9.
  - `.agents/skills/audit-before-commit/SKILL.md`. Era byte a byte la de
    0.7.0 y queda byte a byte la de 0.8.1: los pasos auditan el árbol de
    trabajo y gana el noveno, preparar por nombre de ruta con la autorización.
    La línea de su índice en el §9 del contrato no cambia.
- **Redacción antigua:** `git grep` de la auditoría de lo preparado ya no la
  encuentra fuera de las entregas; `git diff --cached` solo queda como la
  confirmación tras `git add`, en el contrato y en la skill. `OPERATIONS.md`
  y `portfolio-conventions` no describen cómo se pide un commit.
- **Las correcciones del starter React (commit `781300f` del catálogo) no se
  portan, porque el producto no conserva el código de la muestra.** El
  catálogo las pide «where the product still has the sample's code», y aquí
  no existe ninguno de sus ficheros: ni la hoja global de la muestra, ni el
  elemento de tarea, ni el formulario de alta, ni los estilos de su página de
  inicio; la interfaz es Material UI y el único CSS es
  `frontend/src/app/styles/index.css`. Lo que el código propio hace en esos
  tres frentes se miró en el código, sin navegador, y no se cambió:
  - *Tamaño de letra de la raíz.* `:root` en
    `frontend/src/app/styles/index.css` (líneas 1 a 10) fija familia, peso e
    interlineado, no un tamaño; el indicador de arranque de
    `frontend/index.html` (línea 75) usa `1rem`, y la tipografía del tema
    (`frontend/src/shared/config/theme.ts`, desde la línea 58) va en `rem`.
    No se vio el defecto de la muestra.
  - *Texto que escribe el usuario.* El formulario de contacto no pinta lo
    escrito fuera de sus campos. La terminal de la página de dirección
    desconocida sí repite cada orden, y su zona de salida ya corta con
    `overflowWrap: 'anywhere'`
    (`frontend/src/pages/not-found/ui/NotFoundPage.tsx`, línea 226), como el
    correo de `frontend/src/pages/contact/ui/ContactPage.tsx` (línea 81).
  - *Ids de formulario.*
    `frontend/src/features/contact-form/ui/ContactForm.tsx` no escribe ningún
    id: sus tres campos son `TextField` de Material UI 9.5.0, que genera el id
    del campo y enlaza la etiqueta y el texto de ayuda. Los selectores de tema
    y de idioma ya usan `useId()`. Los dos ids fijos que quedan no son de
    formulario y se montan una vez por página: `main-content` en
    `frontend/src/app/layouts/ui/PublicLayout.tsx` (línea 11) y
    `mobile-navigation` en `frontend/src/widgets/navbar/ui/Navbar.tsx`
    (línea 27).

  Ninguno se registra como hueco: no se vio fallar nada, y cambiarlos sería
  comportamiento del producto, que decide el dueño.
- **Lo que no entra, a propósito:** ninguna guía de diseño ni fila para ella.
  El catálogo dice que un producto anterior no la recibe al actualizarse y
  que escribirla es decisión del dueño. Tampoco cambia ninguna imagen,
  lockfile ni versión de dependencia, ni nada del despliegue: `Dockerfile`,
  `compose.yaml`, `tools/stack.txt`, `frontend/package.json`,
  `frontend/pnpm-lock.yaml`, `frontend/vercel.json`,
  `tools/board/scaffold.json` y `tools/board/Dockerfile.scaffold` quedan como
  estaban.

**Cómo se verificó.**

- Al arrancar: árbol limpio e igual que el remoto en `f27f270`, commit que el
  hook `pre-push` verificó al publicarlo, así que se dio por verificado (§1
  del contrato).
- Al terminar, `.\dev.cmd verify` completo sobre el árbol con la
  actualización, sin `prepare` porque no cambió ninguna imagen ni lockfile:
  `board: tests` 830 checks y 0 fallos (811 con el motor anterior),
  `board: build` sin cambios, `board: documents` 28 comprobaciones y 0
  hallazgos, `dependencies`, `format`, `lint` y `typecheck` en verde, `tests`
  403 tests con 0 fallidos y 0 con error, y `build` en verde; 9 puertas, 0 en
  rojo. Una corrida completa tardó alrededor de un minuto, sin descargar ni
  construir nada.
- No hay test de regresión propio: el cambio es del motor, cuyos defectos
  reintroducidos conserva el catálogo, y de prosa del contrato y de la skill.
- La verificación completa de este commit es la del hook `pre-push` al
  empujarlo.

**Pendiente.** Nada de esta actualización. Decide el dueño, sin registro
abierto: si el producto quiere una guía de diseño propia.
