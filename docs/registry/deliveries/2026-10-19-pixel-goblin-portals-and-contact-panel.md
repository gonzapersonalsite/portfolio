---
title: Portales pixel 2D de entrada y salida y reutilización en el panel de Contacto
date: 2026-10-19
phase: F1
---
**Objetivo y dueño:** producto; parte `F1.2` de `F1`. Decisión:
`#pixel-goblin-portals-and-contact-panel`.

**Qué cambió.**
- `frontend/src/widgets/pixel-goblin/` (`index.ts`, `model/goblinScene.ts`,
  `model/goblinScene.test.ts`, `ui/PixelGoblin.tsx`): se bajó el duende de
  `pages/home` a `widgets/pixel-goblin` al sumarse `ContactPage` como segundo
  consumidor (eliminando los ficheros antiguos en `pages/home`) y se añadieron
  los portales pixel 2D laterales de entrada (`x = 18`) y salida (`x = 366`) con
  `<clipPath>` intermedio y paletas por tema.
- `frontend/src/pages/home/ui/HomePage.tsx`,
  `frontend/src/pages/home/ui/HomePage.test.tsx`,
  `frontend/src/pages/contact/ui/ContactPage.tsx` y
  `frontend/src/pages/contact/ui/ContactPage.test.tsx`: consumo compartido de
  `PixelGoblin` desde `@/widgets/pixel-goblin` sobre la tarjeta del hero de
  Inicio y sobre el panel del formulario de Contacto, con sus pruebas de
  integración.
- `.agents/skills/portfolio-conventions/SKILL.md` y `docs/ROADMAP.md`:
  actualización de la convención de movimiento decorativo y registro de `F1.2`.

**Cómo se verificó.** Se inyectaron defectos ejecutables en `goblinScene.ts`
(`portalCenterY = 12 * U` y recorte de `particles`) y en `PixelGoblin.tsx`
(inversión de `running` en `setSvgAnimationRunning`), viendo fallar
`goblinScene.test.ts`, `HomePage.test.tsx` y `ContactPage.test.tsx`, y se
revirtieron con la edición inversa. `python verify.py` cerró en verde con las 9
puertas (`0 en rojo`, 179 tests en 39 archivos).

**Pendiente.** Nada; `#hero-goblin-scene-and-resting-pose` y
`#pixel-goblin-portals-and-contact-panel` confirmadas por el dueño.
