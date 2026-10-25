---
title: Actualizar la galería de Quotidia con la navegación en cápsula
date: 2026-10-25
phase: none
---
**Actualizar la galería de Quotidia con la navegación en cápsula.**

**Objetivo y dueño.** Mantenimiento de contenido solicitado por el dueño como
parte de la publicación de Quotidia 1.4.1. No abre una fase ni cambia lógica,
componentes, dependencias o contratos de navegación del portafolio.

**Qué cambió.** Se sustituyen las tomas 1, 4, 5, 6, 7 y 8 de Quotidia por las
capturas reales de su versión 1.4.1 (18), con barra en cápsula y botón de añadir
redondo. La portada se recompone con las tres primeras tomas y la captura de
Quotidia dentro de Gonzalo Apps se renueva desde la página generada localmente,
capturada en Chrome a 1920 por 1080 píxeles. Las tomas 2 y 3 no cambian.

Las ocho bases reciben nombres nuevos para invalidar la caché inmutable.
Sus veinticuatro variantes WebP sustituyen a las anteriores, contrastadas con
Git antes de retirarlas. Los consumidores siguen leyendo el mismo JSON; los
textos alternativos de ambos idiomas conservan su descripción válida.

**Cómo se verificó.** La base pasó `python verify.py` antes de modificarla.
Las fuentes de Quotidia pasaron su revisión de dimensiones, RGB sin alfa,
proporción, barra de estado y encuadre. Se revisaron visualmente las imágenes
y se comprobaron las variantes y las referencias del JSON. La página de
Gonzalo Apps se comprobó en Chrome con su captura nueva visible. La puerta
completa pasó con sus nueve puertas en verde. La revisión en Chrome de
`/en/projects` y `/projects` confirmó la portada, el encuadre de Diario y la
captura de Gonzalo Apps, con las imágenes cargadas y los textos alternativos
de ambos idiomas.

**Publicación.** Vercel despliega esta entrega desde `main`. El estado de la
campaña conjunta y su verificación remota se registran en la auditoría de
Quotidia `docs/governance/audits/release-1-4-1-audit-2026-10-25.md`.
Las evidencias de esta campaña viven en
`agent-work/quotidia-store-release-2026-10-25`, fuera del producto.
