---
title: Duende pixelado sobre la tarjeta del hero de Inicio
date: 2026-10-19
phase: F1
---
**Objetivo y dueño:** producto; parte `F1.1` de `F1`. Decisiones:
`#hero-card-hosts-the-profile-pixel-goblin` y
`#hero-goblin-scene-and-resting-pose`.

**Qué cambió.**
- `frontend/src/widgets/pixel-goblin/model/goblinScene.ts` y
  `frontend/src/widgets/pixel-goblin/model/goblinScene.test.ts`: modelo puro que
  porta el sprite, las paletas de tema (`light` y `dark`/`glass`), la geometría
  de suelo (`GOBLIN_GROUND_OFFSET_PERCENT = 10`, fila 18 de 20) y los
  cronogramas SMIL de 16 s de `gonzapersonalsite/scripts/render_goblin.py`.
- `frontend/src/widgets/pixel-goblin/ui/PixelGoblin.tsx`,
  `frontend/src/pages/home/ui/HomePage.tsx` y
  `frontend/src/pages/home/ui/HomePage.test.tsx`: componente SVG montado dentro
  del contenedor flotante del hero (`bottom: '100%'`, `px: 4`,
  `translateY(10%)`), con despacho por `GoblinMotion` (`animated` / `resting`)
  conectado a `animationsPaused` y `prefers-reduced-motion: reduce`.
- `frontend/src/shared/config/i18n.ts` y
  `.agents/skills/portfolio-conventions/SKILL.md`: etiqueta accesible bilingüe
  `home.goblinLabel` (`en`/`es`) y documentación del comportamiento de
  movimiento decorativo.

**Cómo se verificó.** Se inyectaron dos defectos ejecutables: cambiar
`GOBLIN_GROUND_OFFSET_PERCENT` de `10` a `0` en `goblinScene.ts` (cazado por
`goblinScene.test.ts`) y cambiar `||` por `&&` en la guarda de movimiento de
`PixelGoblin.tsx` (cazado por los dos tests de reposo en `HomePage.test.tsx`), y
se revirtieron con la edición inversa. `python verify.py` arrancó en verde sobre
`6568df0` (`9 puertas, 0 en rojo`) y cerró en verde (`9 puertas, 0 en rojo`,
175 tests en 38 archivos).

**Pendiente.** Confirmación por el dueño de
`#hero-goblin-scene-and-resting-pose` en un turno posterior tras revisar la
entrega.
