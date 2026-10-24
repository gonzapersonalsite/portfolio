---
title: El dueño autoriza corregir el aviso de consumo de recursos de Zod en el lint
state: confirmed
date: 2026-10-24
phase: none
---
**El dueño autoriza corregir el aviso de consumo de recursos de Zod en el lint.**
Tras exponer el riesgo y su alcance, el dueño autorizó el parche puntual y su
verificación. No abre un tramo ni autoriza otras actualizaciones. La auditoría
del gestor detectó el aviso alto
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
en Zod 4.4.3, anterior a la versión corregida 4.6.6. Es una dependencia de
desarrollo preexistente de `eslint-plugin-react-hooks` 7.1.1, directamente y a
través de `zod-validation-error` 4.0.2; no la introduce esta entrega.

La corrección del proveedor aplica los límites de tamaño de arrays, sets y maps
antes de analizar sus elementos. En el plugin instalado, Zod valida opciones y
configuración del compilador de React. `frontend/eslint.config.js` usa la
configuración recomendada y bloquea ajustes inline; no se encontraron imports
de Zod en `frontend/src`, `frontend/tooling` ni en la configuración de Vite.
No se ha demostrado una ruta desde entradas de la web publicada hasta esta API.
El riesgo observado es de la herramienta local, no evidencia de explotación
del producto; aun así, el dueño pidió corregirlo en esta entrega.

Ambos consumidores admiten el parche 4.6.7 dentro de sus rangos existentes.
Se resuelve con pnpm y se fija en el lockfile, sin override ni nueva dependencia
directa. Se eligió el parche compatible disponible porque pnpm no admite fijar
una versión transitiva en `update` sin añadir un override. La
[comparación oficial](https://github.com/colinhacks/zod/compare/v4.6.6...v4.6.7)
solo cambia números de versión y referencias internas respecto a la versión
corregida 4.6.6. El paquete procede del registro npm oficial, sin dependencias
ni scripts de instalación; su publicación supera los 1440 minutos exigidos.
La restauración mantiene los scripts bloqueados. La entrega registra el diff,
las puertas y el resultado de la auditoría tras el parche.
