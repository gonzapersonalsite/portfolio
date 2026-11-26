---
title: La portada enfocada de un proyecto dibuja su anillo sobre la capa que la oscurece, blanco con una banda oscura dentro
state: confirmed
date: 2026-11-25
domain: interface
phase: none
---
**Cuando el teclado lleva el foco a la portada de un proyecto, el anillo lo
dibuja la capa que oscurece la captura, no el botón: un contorno blanco de 3
píxeles en el borde y, dentro, una banda casi negra de 2.** Así una de las dos
destaca a más de 3:1 de lo que muestre la captura, también de una blanca. Está
definido en `ProjectCard.css` sobre la capa interior de `ProjectCard.tsx` y lo
sujeta `ProjectCard.test.tsx`.

El botón no puede llevarlo: la capa está posicionada y el navegador la pinta
encima del contorno de su padre, así que el anillo blanco del botón salía
atenuado al 60 % y, sobre la captura casi blanca de Quotidia, no se distinguía
(2,81 a 3,15 de contraste máximo, ningún píxel a 3:1). Con el contraste forzado
del sistema la banda desaparece y el contorno toma el color del sistema, encima
de la capa.

Propuesta por el agente y confirmada por la delegación que el dueño dio antes
de escribirla: «todo entra confirmado no dejes nada provisional» y «Tu decides
por el bien de cada proyecto». La regla dura 9 pide que la confirmación llegue
en un turno posterior; el dueño pidió expresamente que nada quedara
provisional. Medida en `#2026-11-24-interface-decisions-closed-before-redesign`.

## Refutación

En contra: un anillo de dos colores es una elección de aspecto que conviene
revisar si cambia el tratamiento visual de las tarjetas. Se mantiene en
«Mesa de Taller» (`#visual-redesign-workbench-two-themes`): el anillo blanco ya
existía, la banda oscura solo aparece con el foco del teclado para mantener el
3:1 sobre cualquier captura y el rediseño lo conserva en sus hojas de estilo.
