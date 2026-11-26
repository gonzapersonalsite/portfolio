---
title: Dirección «Mesa de Taller» en claro y oscuro con controles HTML directos
state: confirmed
date: 2026-11-26
domain: interface
phase: F3
---
**El rediseño adopta «Mesa de Taller» refinada con únicamente dos temas (`light` y
`dark`) y controles HTML estándar y directos para tema e idioma.** Lo decidió el
dueño al aprobar la propuesta y elegir la opción de controles directos sin
`role="menu"`, que se despliega en la fase `F3` (`#2026-11-25-native-dialog-project-gallery`).

En concreto, rige todo esto en las partes que lo implementan:

- **Temas (`light` y `dark`) y compatibilidad pasiva:** Liquid Glass desaparece
  como tema seleccionable. Si un visitante conserva guardado `glass` en
  `themeMode`, se sigue la preferencia del sistema mientras ese valor siga
  guardado, sin sobrescribirlo automáticamente.
- **Controles directos sin menú ARIA:** el selector de tema y el de idioma pasan
  a botones HTML directos (opción 2). El cambio de idioma navega a la página
  equivalente en el idioma elegido.
- **Animaciones decorativas:** la pausa de animaciones sigue fácil de encontrar y
  respeta la preferencia de movimiento reducido del sistema operativo.

La tipografía no forma parte de esta decisión: el dueño delegó su elección y la
propuesta del agente vive aparte, pendiente de su confirmación
(`#workbench-type-is-self-hosted-inter-with-technical-features`).
