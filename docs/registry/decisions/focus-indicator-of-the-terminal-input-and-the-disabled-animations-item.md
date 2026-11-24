---
title: La terminal del 404 conserva el contorno del navegador y la opción de animaciones es alcanzable con opacidad completa
state: confirmed
date: 2026-11-24
domain: interface
phase: none
---
**Tanto el campo de comandos de la página 404 como la opción deshabilitada «Animaciones»
muestran su foco al navegar con teclado y explican su estado sin ocultarlo.**

- **Terminal del 404 (`NotFoundPage.tsx`).** El campo de entrada conserva el contorno de
  foco propio del navegador con separación (`outlineOffset`) en lugar de suprimirlo,
  cubierto por `NotFoundPage.test.tsx` y medido en Chrome sobre los temas claro, oscuro y
  Liquid Glass por encima del mínimo `3:1`.
- **Opción de animaciones (`ThemeSelector.tsx`).** El menú declara `disabledItemsFocusable`
  para permitir recorrer la opción con teclado aun cuando `reducedMotion` la deshabilita,
  conserva opacidad `1` en el elemento deshabilitado para que su foco y motivo en
  `aria-describedby` sigan legibles y atenúa solo la etiqueta principal
  (`ThemeSelector.test.tsx`).

Propuesto por el agente bajo la delegación del dueño («No quiero deuda de ningun tipo»,
«Dejo a tu preferencia recomendados») y verificado en
`#2026-11-24-interface-decisions-closed-before-redesign`.

**Confirmada por delegación del dueño**, que en un turno posterior, con la refutación de
abajo escrita, delegó su revisión: «todo entra confirmado no dejes nada provisional» y «Tu
decides por el bien de cada proyecto».

## Refutación

En contra: dibujar un marco propio alrededor del campo de la terminal o saltar del teclado
una opción deshabilitada oculta el cursor de teclado o impide leer por qué no se puede
activar las animaciones. Se mantiene: delegar en el contorno del navegador en la terminal y
conservar el foco y opacidad legible en el menú resuelve ambos casos sin inventar estética
nueva, a la espera del rediseño visual (`#choices-of-look-wait-for-the-visual-redesign`).
