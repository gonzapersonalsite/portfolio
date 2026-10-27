---
title: El paso de subir la tarjeta como vista previa del repositorio en GitHub queda escrito
date: 2026-10-27
phase: none
---
**Objetivo y dueño:** producto; un paso de operación que pidió el dueño tras
encontrar en GitHub la tarjeta anterior. Decisión:
`#github-social-preview-is-a-tolerated-copy`.

**Qué cambió.** El procedimiento de la vista previa social de `OPERATIONS.md`
y de su copia en español añade, tras los refrescos en LinkedIn y Facebook,
subir la imagen nueva en *Settings → General → Social preview* del repositorio
en GitHub.

**Cómo se verificó.** Con la API de GitHub (`usesCustomOpenGraphImage`,
`openGraphImageUrl`) se listaron los repositorios del dueño que tienen una
vista previa propia: `portfolio`, `license-generator-docs` y
`kanban-board-app`. Solo la del portafolio llevaba la marca anterior. Tras
subirla el dueño, la imagen publicada coincide píxel a píxel con
`og-cover-gonzalo-martinez-full-stack.jpg`. Es un cambio de documentación sin
test que pueda fallar; las puertas pasan.

**Pendiente.** La decisión queda provisional hasta que el dueño la confirme
tras releer su refutación.
