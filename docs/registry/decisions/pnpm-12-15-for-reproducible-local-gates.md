---
title: El dueño autoriza fijar pnpm 12.15.0 y comprobar su compatibilidad
state: confirmed
date: 2026-10-24
phase: none
---
**El dueño autoriza fijar pnpm 12.15.0 y comprobar su compatibilidad.** Después
de informar de que la versión fijada anterior faltaba en la caché para la
restauración offline, el dueño pidió actualizar al gestor ya instalado, sujeto
a verificar que no rompe el proyecto. Es una autorización puntual de herramienta;
no abre un tramo ni autoriza futuras actualizaciones de dependencias.

La versión y su SHA-512 viven en `../../../frontend/package.json`; las
resoluciones del gestor viven en el primer documento de su lockfile. Se
contrastaron con el registro npm oficial antes de validar el cambio. Esta
actualización del gestor conserva el segundo documento del lockfile, que
contiene las dependencias del proyecto; su parche de Zod se justifica aparte en
`#review-zod-lint-resource-exhaustion-advisory`.

Además de recuperar la restauración offline con el gestor disponible, esta
versión rechaza metadatos de registro cuyo nombre de paquete no coincide con el
solicitado, evitando eludir la aprobación de scripts mediante esa discrepancia.
Fuente: [notas oficiales de pnpm](https://github.com/pnpm/pnpm/releases/tag/v12.15.0).
No se instala otro gestor global ni se habilitan scripts para hacer el cambio.
