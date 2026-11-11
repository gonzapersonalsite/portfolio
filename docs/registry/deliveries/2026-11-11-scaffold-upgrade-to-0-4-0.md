---
title: Actualización a agentic-scaffold 0.4.0, con el tablero como página
date: 2026-11-11
phase: none
---
**Objetivo y dueño:** herramientas de desarrollo, a petición del dueño.
`templates` publicó `agentic-scaffold` 0.4.0 en el commit `d94a2b3`: el tablero
escribe además `board.html`, el estado del proyecto como página que se abre en
un navegador. Este repositorio lo toma con `upgrade.py` desde `771371a`.

**Qué cambió.**

- **Motor**, de 0.3.3 a 0.4.0: toma `tools/board/board.py`,
  `tools/board/test_board.py`, `tools/board/adopt.py` y `tools/board/README.md`,
  y reescribe `tools/board/MANIFEST.txt` y `tools/board/components.txt`.
- **`board.html`, nuevo y derivado:** lo escribe el build desde el mismo modelo
  que `STATUS.txt`, con el nombre que da el título de `README.md`. Enseña el
  veredicto puerta a puerta, la línea de orden de cada plan, todas las fases,
  los frentes abiertos y las deudas. Lleva sus estilos dentro, no carga ni
  ejecuta nada, y no entra en la lectura de arranque. Vive en la raíz del
  repositorio, fuera de `frontend/`, que es lo que se despliega y lo que
  Prettier formatea.
- **La capa y las piezas del stack**, sin cambios: la plantilla no tocó nada
  de `layer:react-vite`, y las piezas de `stack:react-fsd` son todas de este
  producto (`--keep`).
- **A mano, de lo pendiente del plan:** `AGENTS.md` nombra `board.html` entre
  los derivados en sus tres sitios (la fila del tablero del §4, la lectura de
  arranque del §5 y el glosario). El texto de las excepciones de seguridad que
  la plantilla cambió ya estaba aquí. De `README.md` no entra nada: las líneas
  que la plantilla cambió son de su propio README, y el de este repositorio es
  del producto.

**Cómo se verificó.** Antes de tocar nada, `python -I verify.py` pasó sus 9
puertas. `upgrade.py` planificó `356aba33ab93` sin problemas, `--apply` lo
escribió y `--done` cerró `AGENTS.md` y `README.md`. Después, `python -I
verify.py` pasó sus 9 puertas, con `board: tests` en 746 checks y 0 fallos, y
escribió `board.html`; otra corrida dio el mismo veredicto sin cambiar ningún
fichero.

**Pendiente.** Nada.
