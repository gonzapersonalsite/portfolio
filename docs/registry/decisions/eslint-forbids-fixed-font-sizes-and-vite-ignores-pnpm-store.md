---
title: La regla de tamaño relativo y el filtro del servidor de desarrollo guardan las puertas de verificación
state: confirmed
date: 2026-11-24
domain: verification
phase: none
---
**El entorno de pruebas y linter evita regresiones de escala tipográfica y de arranque en
desarrollo.**

- **Regla de estilo en ESLint (`eslint.config.js`).** `no-restricted-syntax` prohíbe
  valores fijos en `fontSize`, verificada caso a caso en `eslint.config.test.ts` (con la
  única excepción de `PixelGoblin`).
- **Observador de desarrollo en Vite (`vite.config.ts`).** El servidor ignora la tienda
  interna de paquetes del contenedor (`watch` con `ignored` sobre `.pnpm-store`) para no
  bloquear peticiones de módulos con errores `504`, verificado en
  `frontend/tooling/dev-server/watcher.test.ts` y en arranque real con `.\dev.cmd start`.

Propuesto por el agente bajo la delegación del dueño («No quiero deuda de ningun tipo»,
«Dejo a tu preferencia recomendados») y verificado en
`#2026-11-24-interface-decisions-closed-before-redesign`.

**Confirmada por delegación del dueño**, que en un turno posterior, con la refutación de
abajo escrita, delegó su revisión: «todo entra confirmado no dejes nada provisional» y «Tu
decides por el bien de cada proyecto».

## Refutación

En contra: depender solo de revisiones manuales en navegador dejaría colarse tamaños en
píxeles o retardos por el almacenamiento enlazado de paquetes dentro del contenedor. Se
mantiene: la comprobación estática y de configuración atrapa el fallo en segundos antes del
push sin coste en producción.
