---
title: La marca de la barra pinta el apellido en el color de acento
state: confirmed
date: 2026-10-27
phase: none
---
**En la marca `GONZALO MARTÍNEZ`, el apellido lleva el color de acento del
tema (`primary.main`) y el nombre el color del texto.** Lo propone el agente; el
dueño encargó que se le propusiera qué parte lleva el acento. La pantalla de
arranque, que se pinta antes de que exista el tema, atenúa el apellido con la
opacidad que ya usaba para el sufijo de la marca anterior. En
`frontend/src/widgets/navbar/ui/Navbar.tsx`, la última palabra de `logoText`
es la que lleva el acento.

No abre fase: es un detalle de presentación de la marca
(`#visible-brand-is-the-owner-name`).

## Refutación

- **Evidencia en contra:** dos colores parten en dos un nombre que ahora es una
  sola identidad, y el apellido en azul puede leerse como un añadido, que era
  justo el papel del `.DEV` retirado. Las alternativas son el nombre entero en
  el color del texto, o el acento en el nombre de pila.
- **Lo que se mantiene y por qué:** los dos tonos conservan el aspecto que la
  barra tenía, y el apellido es la parte que distingue al dueño. Cambiar de
  opción toca dos líneas (`Navbar.tsx` y `frontend/index.html`) y ningún test,
  porque los tests comprueban el texto, no el color.

2026-10-27: el dueño elige esta opción entre las que le puso el agente. Queda
provisional hasta que la confirme después de releer esta refutación.

2026-10-27: el dueño la confirma después de leer esta refutación.
