---
title: Alinear el identificador y las imágenes del proyecto gonzaloapps-site
date: 2026-10-20
phase: none
---
**Objetivo y dueño:** mantenimiento de contenido y documentación, a petición del dueño.

**Qué cambió.**
- `frontend/public/images/projects/gonzaloapps-site/`: renombrada la carpeta
  de imágenes del proyecto y sus 12 ficheros `.webp` (`00-gonzaloapps-site_home-banner-*`,
  `01-gonzaloapps-site_apps-*`, `02-gonzaloapps-site_quotidia-gallery-*` y
  `03-gonzaloapps-site_es-*`).
- `frontend/src/entities/project/api/data.json`: actualizado el identificador del
  proyecto a `"gonzaloapps-site"` y las cuatro rutas `base` de su galería.
- `OPERATIONS.md`, `docs/es/OPERATIONS.md`, `docs/MIGRATION_PLAN.md` y
  `docs/registry/decisions/localized-spanish-routes-and-shells.md`: alineadas
  las referencias al repositorio `gonzaloapps-site`.

**Cómo se verificó.** `python verify.py` pasó las 9 puertas en verde, incluidos
los tests de integridad de contenido e imágenes (`data.test.ts`).

**Pendiente.** Nada.
