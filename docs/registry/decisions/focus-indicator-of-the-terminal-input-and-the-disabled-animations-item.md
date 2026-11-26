---
title: La terminal del 404 conserva el contorno del navegador y la opción de animaciones es alcanzable con opacidad completa
state: confirmed
date: 2026-11-25
domain: interface
phase: none
---
**Tanto el campo de comandos de la página 404 como la opción deshabilitada «Animaciones»
muestran su foco al navegar con teclado y explican su estado sin ocultarlo.**

- **Terminal del 404 (`NotFoundPage.tsx`).** El campo de entrada conserva su contorno
  de foco visible con separación mediante CSS en lugar de suprimirlo, cubierto por
  `NotFoundPage.test.tsx` y medido en Chrome sobre los temas claro y oscuro por encima
  del mínimo `3:1`.
- **Opción de animaciones (`ThemeSelector.tsx`).** El botón HTML directo permanece
  alcanzable por teclado usando el atributo HTML `aria-disabled` (no `disabled`) aun
  cuando `reducedMotion` bloquea el cambio, conserva opacidad `1` y borde discontinuo
  en `ThemeSelector.css` para que su foco y el motivo en `aria-describedby` sigan
  legibles (`ThemeSelector.test.tsx`).

Propuesto por el agente bajo la delegación del dueño («No quiero deuda de ningun tipo»,
«Dejo a tu preferencia recomendados») y verificado en
`#2026-11-24-interface-decisions-closed-before-redesign`.

**Confirmada por delegación del dueño**, que en un turno posterior, con la refutación de
abajo escrita, delegó su revisión: «todo entra confirmado no dejes nada provisional» y «Tu
decides por el bien de cada proyecto».

## Refutación

En contra: dibujar un marco propio cerrado o saltar del teclado una opción
deshabilitada oculta el foco o impide leer por qué no se puede activar las
animaciones. Se mantiene: conservar el foco visible en la terminal y mantener
alcanzable y legible con `aria-disabled` el botón directo de animaciones resuelve
ambos casos (`#visual-redesign-workbench-two-themes`).
