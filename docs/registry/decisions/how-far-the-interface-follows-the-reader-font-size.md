---
title: Toda la interfaz sigue el tamaño de letra del lector en rem y em, con regla en ESLint
state: confirmed
date: 2026-11-25
domain: interface
phase: none
---
**La raíz no fija tamaño de letra en píxeles y los estilos y hojas de componentes usan
unidades relativas (`rem`, `em` y puntos de ruptura en `rem`), de modo que la interfaz
escala cuando el lector cambia la letra del navegador.** El único código exento es el texto
dibujado dentro del `viewBox` SVG de `PixelGoblin`, que escala como imagen junto al resto
del dibujo.

- **Tokens, hojas y componentes (`tokens.css`, `index.css`, `Navbar.css`, `HomePage.css`).**
  Los puntos de ruptura, márgenes, botones, iconos SVG (dimensionados en `em`) y etiquetas
  escalan con el lector y usan el punto de ruptura `19.99em` para envolver enlaces,
  marcas y ajustar el titular cuando coinciden ventana estrecha (`320 px`) y texto grande
  (`24 px`), manteniendo `scroll-padding-top` en `rem` bajo la cabecera fija.
- **Guarda automática (`eslint.config.js`).** La regla `no-restricted-syntax`
  (`FONT_SIZE_FOLLOWS_THE_READER`) rechaza cualquier `fontSize` numérico o en `px` en
  estilos y atributos JSX de `src`, salvo en `PixelGoblin` (`eslint.config.test.ts`).

Propuesto por el agente bajo la delegación del dueño («No quiero deuda de ningun tipo»,
«Dejo a tu preferencia recomendados») y verificado en
`#2026-11-24-interface-decisions-closed-before-redesign` en Chrome (`320 px` a `24 px` y
zoom al `200 %` sin desbordamiento horizontal ni textos cortados).

**Confirmada por delegación del dueño**, que en un turno posterior, con la refutación de
abajo escrita, delegó su revisión: «todo entra confirmado no dejes nada provisional» y «Tu
decides por el bien de cada proyecto».

## Refutación

En contra: mantener alturas y puntos de ruptura fijos en píxeles conserva cajas idénticas
aunque el texto crezca, pero desborda etiquetas y desacopla iconos del texto a `24 px`. Se
mantiene: escalar en `rem` y `em` con la guarda en ESLint conserva intacta la vista a
`16 px` mientras protege la lectura ampliada en el rediseño visual
(`#visual-redesign-workbench-two-themes`).
