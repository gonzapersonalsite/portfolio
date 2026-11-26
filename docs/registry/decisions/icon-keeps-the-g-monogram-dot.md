---
title: El icono adopta Mesa de Taller con G crema y punto naranja en ficheros nuevos
state: confirmed
date: 2026-11-25
domain: brand
phase: none
---
**El icono del portafolio adopta la estética «Mesa de Taller»: cuadrado carbón
(23, 24, 26) con filete de borde (52, 56, 65), «G» crema (244, 241, 234) y punto
naranja acento (255, 120, 71), en los ficheros nuevos `g-workbench.*` dentro de
`frontend/public/icons/`.** Lo decidió el dueño al pedir que el favicon y la
tarjeta social cambien con el rediseño completo
(`#visible-brand-is-the-owner-name`, `#visual-redesign-workbench-two-themes`).
`BrandMarkIcon` en `frontend/src/shared/ui/Icons.tsx` comparte el mismo trazo,
perímetro y posición del punto.

No abre fase: renombra y regenera los iconos de `frontend/index.html` porque
production los sirve con caché inmutable de un año (`frontend/vercel.json`).

## Refutación

- **Evidencia en contra:** un icono cuadrado muy oscuro puede perder contorno
  en barras de pestañas oscuras, y añadir filete más punto en `16 px` exige
  grosor suficiente para que no se empasten al reducirse.
- **Lo que se mantiene y por qué:** el filete perimetral de dos unidades separa
  la pieza en pestañas claras y oscuras, el trazo de siete unidades y el punto
  de radio cinco conservan lectura nítida a `16`, `32` y `48 px`
  (`g-workbench.ico` y `g-workbench.svg`), y `g-workbench-180.png` rellena opaco
  a sangre completa para Apple Touch Icon.
