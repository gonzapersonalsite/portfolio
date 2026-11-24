---
title: Está por decidir qué dibuja el foco del teclado en el campo de la terminal y en la opción de animaciones deshabilitada
state: open
date: 2026-11-24
domain: interface
phase: none
---
**Está por decidir qué dibuja el foco del teclado en dos controles donde hoy
no se distingue.** En el resto del sitio cada parada del tabulador dibuja su
foco, y `DESIGN.md` lo enuncia. Las dos salvedades, medidas en
`#2026-11-24-design-guide-and-current-operations-docs`:

- **El campo de la terminal de la página 404**
  (`frontend/src/pages/not-found/ui/NotFoundPage.tsx`) quita su contorno. Con
  el foco solo se ve el cursor de texto, que parpadea.
- **La opción «Animaciones» del selector de tema**
  (`frontend/src/features/theme-switch/ui/ThemeSelector.tsx`), cuando el
  sistema pide menos movimiento, está deshabilitada y sigue recibiendo el foco
  para que se pueda leer por qué. Material UI no marca el foco de un elemento
  deshabilitado, así que esa parada no dibuja nada.

Lo que hay que decidir es el aspecto de cada foco, porque cualquiera de las
salidas cambia cómo se ve un estado: en el campo, un contorno propio o el del
navegador; en la opción, dibujar el foco también deshabilitada, dejarla
habilitada diciendo que manda el sistema, o sacarla del recorrido.

No abre fase: las tres del plan están hechas. Tropieza con ella la primera
parte que toque la página 404 o el selector de tema.
