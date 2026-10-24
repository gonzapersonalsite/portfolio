---
title: Contrato de instalación coherente y herramientas verificadas sin el aviso de Zod
date: 2026-10-24
phase: none
---
**Objetivo y dueño:** herramienta; mantenimiento autorizado tras la auditoría
del ecosistema, sin abrir fase ni tramo. Decisiones:
`#owner-authorises-specific-security-exceptions`,
`#pnpm-12-15-for-reproducible-local-gates` y
`#review-zod-lint-resource-exhaustion-advisory`.

**Qué cambió.** `AGENTS.md` incorpora la cláusula de autoridad revisada en la
plantilla y reconcilia el bloqueo de scripts con las aprobaciones concretas del
dueño. La lista ejecutable sigue únicamente en `frontend/pnpm-workspace.yaml`:
se conserva la aprobación existente de esbuild, sin añadir ni ejecutar scripts.
No se reescribe la documentación histórica ni se declara una actualización del
motor sellado. `frontend/package.json` fija pnpm 12.15.0 con SHA-512; en
`frontend/pnpm-lock.yaml` se actualizan su bloque y, con autorización posterior,
Zod 4.4.3 a 4.6.7 en las herramientas de lint. No cambia código del producto.

**Cómo se verificó.** Sobre el commit inicial
`561d59a4d6cdfe9d90034084dab4af15c2b8b147`, la puerta de dependencias falló con
`ERR_PNPM_NO_OFFLINE_TARBALL`: pnpm 12.14.0 no estaba en la caché local. Tras la
autorización, las 15 integridades del gestor y el hash de `packageManager` se
contrastaron con npm oficial. El lock se regeneró offline, con `--lockfile-only`
y `--ignore-scripts`; no hubo descarga ni instalación global. En ese paso el
documento de dependencias del proyecto quedó idéntico byte a byte en LF.

Un intento completo bajo carga falló por el timeout de 5 s de una petición al
servidor Vite en `tooling/agent-files/vitePlugin.test.ts`. La suite completa
posterior pasó las 402 pruebas y el gate completo, sin otras suites pesadas,
pasó nueve puertas con veredicto estable antes de editar el contrato. No se
cambió código de pruebas, tiempos límite ni presupuestos de las puertas.

La auditoría adicional encontró `GHSA-mrhx-c7xc-m3w5` en Zod. Tras autorizar el
dueño su corrección,
`pnpm --dir frontend update zod --depth Infinity --lockfile-only --ignore-scripts`
resolvió 4.6.7. Su origen y SHA-512 se contrastaron con npm
oficial; no tiene dependencias ni scripts de instalación y cumple la antigüedad
mínima, sin alterar `minimumReleaseAge`. Una comparación automática contra el
lock inicial confirma que el segundo documento solo cambia esa versión, su
integridad y las referencias de peers. No se añadieron overrides.

`pnpm --dir frontend install --frozen-lockfile --ignore-scripts` restauró desde
la caché con cero descargas. `pnpm --dir frontend audit --json` pasó de un aviso
alto a cero vulnerabilidades, con código 0. Las pruebas y el lint validan el
consumidor real; no se añade un test propio que duplique los del proveedor.

La comprobación completa `python -u -I verify.py` del contrato y el parche pasó
las nueve puertas con código 0 y veredicto estable: 728 checks del tablero,
24 comprobaciones documentales sin hallazgos y 402 pruebas de Vitest, además
del resto de las puertas declaradas. El defecto de restauración se observó
antes del cambio y lo cubre la puerta de dependencias existente; la corrección
de prosa no introduce comportamiento que requiera un test de regresión nuevo.

**Pendiente.** Ninguno para este mantenimiento; el parche no actualiza otras
dependencias.
