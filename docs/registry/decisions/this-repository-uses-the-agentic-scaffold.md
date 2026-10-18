---
title: Este repositorio usa el andamio agéntico, y su conocimiento vive en registros
state: confirmed
date: 2026-10-18
---
**El repositorio se gobierna con el andamio agéntico:** un contrato en la raíz que la
herramienta carga al arrancar, las puertas de `gates.txt` como única verdad, y todo el
conocimiento que no es código en `docs/registry/` como ficheros con cabecera, uno por
decisión, lección y entrega, con índices generados por el tablero.

**Lo que esto fija.** Nada se borra: lo que deja de gobernar cambia de estado o lleva
`retired`. El estado es un campo que una puerta lee, nunca prosa que un validador
adivina. La lectura de arranque tiene tope, el contrato es intemporal y todo markdown
del árbol tiene casa declarada. Las reglas son puertas, no prosa; el resumen del
estado sale del mismo modelo que el validador valida; y el procedimiento es el mismo
en todos los repositorios que nazcan de la plantilla. Los registros que llegaron con
ella dicen su `origin` y conservan la fecha que tenían allí: adoptarla los adopta.

**Lo que se acepta a cambio.** Muchos ficheros pequeños en vez de dos grandes; se
navega por los índices y por `grep`. El andamio impone Python 3 sin dependencias, y
solo al andamio.

**Alternativa refutada.** Un registro monolítico con topes de bytes: el tope no acota
el crecimiento, programa la siguiente cirugía manual
(`#lesson-a-cap-schedules-the-next-crisis`).
