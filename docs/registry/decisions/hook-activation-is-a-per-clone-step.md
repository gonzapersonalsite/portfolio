---
title: Activar el hook de pre-push es un paso por clon, no una puerta
state: confirmed
date: 2026-09-21
origin: agentic-scaffold
---
**Activar el hook de pre-push es un paso por clon y ninguna puerta lo vigila.**
`core.hooksPath` es configuración local de git: no viaja con el clon ni con una
copia. Se activa una vez por clon, como dice `README.md` en «Trabajar aquí», y
`.githooks/pre-push` corre `verify.py` en la máquina que empuja.

**Alternativa refutada.** Una puerta que exija `core.hooksPath` igual a `.githooks`.
Vigilaría el entorno y no el árbol: pondría en rojo una copia sin repositorio git,
como la propia plantilla, y una integración continua que clone y corra `verify.py`
sin necesitar hook alguno; y `git push --no-verify` la saltaría igual. Lo que sí se
exige es que ninguna entrega afirme el hook como propiedad del árbol.
