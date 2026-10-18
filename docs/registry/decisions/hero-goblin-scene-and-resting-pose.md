---
title: Escena SVG tipada en pages/home, encaje sobre el tramo recto de la tarjeta y pose central en reposo
state: confirmed
date: 2026-10-19
phase: F1
---
**El duende del hero se construye desde un modelo puro en `pages/home`, camina
sobre el tramo recto de la tarjeta y reposa en su pose central cuando se pausa
el movimiento.** Elegido por el dueño entre las opciones propuestas antes de
implementar `F1.1`:

- **Componente React SVG tipado:** `model/goblinScene.ts`
  contiene el sprite simétrico, las paletas por `ColorMode` (`light` usa la
  paleta clara original; `dark` y `glass`, la oscura) y el cálculo puro de los
  cronogramas SMIL de 16 s; `ui/PixelGoblin.tsx` renderiza el `<svg>` sin
  ficheros estáticos duplicados en `public/`.
- **Suelo firme y recorrido acotado al techo plano:** `PixelGoblin` vive dentro
  del contenedor que ejecuta el `float` de la tarjeta (`bottom: '100%'`,
  `px: 4` = `32px` a cada lado para respetar `borderRadius: 4` de la tarjeta),
  con `viewBox="0 0 384 60"` y `transform: translateY(10%)` para que la fila 18
  de 20 (base de los pies y del portátil en `y = 54`) descanse exactamente sobre
  el borde superior de la tarjeta a cualquier ancho.
- **Pose estática al pausar o reducir movimiento:** cuando `animationsPaused` o
  `prefers-reduced-motion: reduce` están activos, `PixelGoblin` renderiza la
  variante `resting` (el duende centrado en `translate(147 15)` programando con
  el portátil abierto y los glifos `{}` `</>` `;` visibles, sin nodos SMIL), en
  lugar de congelar el fotograma inicial (`t = 0`), donde el personaje está
  fuera del plano en `x = -135`.

## Refutación

- **Evidencia en contra:** incrustar dos `.svg` estáticos en `public/` habría
  evitado portar el generador de Python a TypeScript; congelar el cronograma
  SMIL con `pauseAnimations()` habría evitado una segunda rama de renderizado.
- **Lo que se mantiene y por qué:** con `.svg` externos en `<img>` no se puede
  conmutar limpiamente a la pose central al pausar ni compartir `ColorMode` e
  i18n desde React, y `pauseAnimations()` en el arranque detendría el ciclo en
  `t = 0` con la tarjeta vacía (`x = -135`). El mapa `SCENE_RENDERERS` por
  `GoblinMotion` (`animated` / `resting`) mantiene toda la geometría en una sola
  fuente (`goblinScene.ts`) y garantiza que el personaje siga sobre la tarjeta
  cuando se desactiva el movimiento.
