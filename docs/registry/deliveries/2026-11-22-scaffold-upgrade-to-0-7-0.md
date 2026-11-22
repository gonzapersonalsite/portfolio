---
title: Actualización a agentic-scaffold 0.7.0 y lanzador containerizado sobre frontend/
date: 2026-11-22
phase: none
---
**Objetivo y dueño:** herramientas de desarrollo, a petición del dueño, para
subir todas las instancias del catálogo a `agentic-scaffold` 0.7.0 sin deuda
pendiente. `templates` publicó 0.7.0 hasta `d086d1e`: el andamio y las puertas
React corren en contenedores Docker Linux coordinados desde el host con `dev` /
`dev.cmd`. Este repositorio lo toma con `templates upgrade` desde `4948119`.

**Qué cambió.**

- **Conciliación previa:** se pasaron las 6 puertas de `gates.txt` a
  `@stack:*` conservando los tiempos de referencia medidos (`0.2`, `0.6`, `3.3`,
  `1.3`, `7.2` y `1.6` s), y se conciliaron `.agents/skills/react-fsd-maintainer/SKILL.md`
  y `docs/ARCHITECTURE.md` conservando la estructura en `frontend/`, MUI,
  EmailJS y Vercel.
- **Motor**, de 0.6.0 a 0.7.0 (`4948119` → `d086d1e`): se actualizan
  `verify.py`, `tools/board/`, `tools/guards/`, `.githooks/commit-msg` y
  `.githooks/pre-push`, se borra el antiguo helper Python del hook, y entran
  `dev`, `dev.cmd`, `tools/launcher/`, `docs/ACTUALIZAR.md` y el runtime del
  andamio (`tools/board/Dockerfile.scaffold`, `tools/board/compose.scaffold.yaml`,
  `tools/board/scaffold.json`).
- **Stack `react-fsd` adaptado a `frontend/`:** se conservan las 16 piezas
  previas marcadas `--keep` (ESLint propio, generador de archivos de agentes,
  MUI y la configuración de pruebas del producto) y entran `.dockerignore`,
  `Dockerfile`, `compose.yaml`, `tools/install-pnpm.py`, `tools/react.sh` y
  `tools/stack.txt`, ajustando `.dockerignore`, `Dockerfile`, `compose.yaml` y
  `tools/react.sh` para montar y ejecutar pnpm dentro de `/workspace/frontend`
  sin alterar el despliegue en Vercel.
- **Lockfile de herramienta:** el documento inicial `packageManagerDependencies`
  de `frontend/pnpm-lock.yaml` se alineó de pnpm 12.15.0 a 12.21.0 (la versión
  ya fijada en `frontend/package.json` con hashes SHA-512 verificados) sin
  alterar el grafo de dependencias del producto.
- **A mano (11 pendientes cerrados con `--done`):** `AGENTS.md` (§1, §3 con las
  dos viñetas actualizadas de `react-vite`, §4 con `docs/ACTUALIZAR.md` y §8),
  `.agents/skills/audit-before-commit/SKILL.md`, `.gitattributes` (`*.bat` y
  `*.cmd` en CRLF tras `* text=auto eol=lf`), `.gitignore` (`.dev-runtime/`),
  `tools/board/documents.txt`, `README.md`, `docs/TOOLING.md` y los bits
  ejecutables de `dev` y `tools/launcher/dev.sh`.

**Cómo se verificó.** El árbol de partida estaba limpio. `templates upgrade`
planificó `8b258d941ca2` sin conflictos y `--apply` lo escribió; los 11
pendientes quedaron cerrados con `--done` (`0` pendientes). `.\dev.cmd prepare`
construyó `tpl-scaffold` y `tpl-react` e instaló las 301 dependencias de
`frontend/` con `--ignore-scripts`; `.\dev.cmd verify` salió en verde con las 9
puertas (811 checks del tablero, 28 comprobaciones de documentos con 0 hallazgos
y 403 tests de Vitest sin fallos).

**Pendiente.** Nada de esta parte.
