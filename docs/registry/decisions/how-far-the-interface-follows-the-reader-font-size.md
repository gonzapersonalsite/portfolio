---
title: Está por decidir hasta dónde sigue la interfaz el tamaño de letra que cada persona eligió
state: open
date: 2026-11-24
domain: interface
phase: none
---
**Está por decidir hasta dónde sigue la interfaz el tamaño de letra que cada
persona eligió en su navegador.** El texto y los iconos que el producto
dimensiona junto a un texto ya lo siguen, y `DESIGN.md` lo enuncia. Lo que no
lo sigue, medido en `#2026-11-24-design-guide-and-current-operations-docs`:

- **Los iconos que dimensiona Material UI en píxeles:** el de un botón con
  icono, el de una etiqueta pequeña y los de los selectores de idioma y de
  tema. Llevarlos a medidas relativas es una regla más en
  `frontend/src/shared/config/theme.ts`, que no cambia nada al tamaño por
  defecto y sí la composición de cada botón con la letra agrandada.
- **El texto dibujado dentro del duende,** que crece con el dibujo y no con la
  letra, y las separaciones y los anchos escritos en píxeles.
- **La combinación de pantalla estrecha y letra grande.** A 320 píxeles CSS con
  la letra a vez y media, cuatro páginas se desplazan de lado por una palabra
  larga de su título, y algunas etiquetas se cortan con puntos suspensivos. Con
  el zoom del navegador al 200 %, que escala todo, eso no ocurre.

Lo que hay que decidir es cuál de las dos cosas garantiza el producto: solo el
zoom, que hoy pasa, o también la letra agrandada en cualquier ancho; y, si es
lo segundo, si los títulos pueden partir una palabra o encoger en una pantalla
estrecha, que es un cambio de aspecto.

No abre fase: las tres del plan están hechas. Tropieza con ella la primera
parte que toque el tema o la composición de una página.
