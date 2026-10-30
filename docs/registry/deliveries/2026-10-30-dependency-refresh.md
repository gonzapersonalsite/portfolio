---
title: Actualización de dependencias y alineación del toolchain de pnpm
date: 2026-10-30
phase: none
---
**Objetivo y dueño:** herramienta; mantenimiento autorizado por el dueño tras
la auditoría de dependencias del ecosistema. No abre fase de producto ni cambia
código ejecutable.

**Qué cambió.** `frontend/package.json` sube `i18next` a 26.5.11,
`react-i18next` a 17.1.9, `react-router-dom` a 7.18.5, `vite` a 8.3.5 y
`typescript-eslint` a 8.72.1; declara `@testing-library/dom` 10.4.2, el peer
que antes resolvía pnpm, y ajusta `engines` al rango del template
(`^24.15.0 || >=26.0.0`), que excluye Node 25. El pin de `packageManager` pasa
a pnpm 12.16.1 con su SHA-512, el mismo que ya tenía la máquina. Se mantiene el
split deliberado de TypeScript (`@typescript/typescript6` y
`@typescript/native`). `frontend/pnpm-workspace.yaml` lleva los overrides de
seguridad a `baseline-browser-mapping` 2.11.34, `browserslist` 4.29.5 y
`esbuild` 0.28.2, dentro de la línea que ya estaba fijada.
`frontend/pnpm-lock.yaml` se regenera con pnpm 12.16.1 y scripts de instalación
desactivados.

**Cómo se verificó.** Antes de editar, `python verify.py` sobre
`1896279f34c0db7e580676d27fb1858c4cbf56f3` dio nueve puertas en verde. La
instalación se hizo desde `frontend/` con `pnpm install --ignore-scripts`; la
política global `ignoreScripts=true` y la puerta `dependencies` restauran
después el lock sin red. Después del cambio, `python verify.py` volvió a dar
nueve puertas en verde: 728 comprobaciones del tablero, 24 comprobaciones
documentales y 403 tests de producto sin fallos, con la puerta de dependencias
ejecutando pnpm 12.16.1. `pnpm audit` no encontró vulnerabilidades. No se
cambió código, configuración de Vite o TypeScript ni tests.

**Pendiente.** TypeScript 7 sigue bloqueado por el peer `<6.1.0` de
`typescript-eslint`; Node 26 y npm 12 son decisiones de toolchain del dueño.
`@mui/lab` 9.0.0-beta.10 sigue siendo la última publicada, sin versión estable.
No se toca ninguna dependencia de otros repositorios.
