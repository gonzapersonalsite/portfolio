---
title: F3 se cierra con la tipografía confirmada por el dueño
date: 2026-11-26
phase: F3
---
**Objetivo y dueño:** producto; cierre de la fase `F3`, que el dueño ordenó
(«cierra ya todo por favor. Y si, se queda inter») después de haber dado por
buena la revisión visual
(`#2026-11-26-activation-capture-second-and-linkedin-projects`). No toca el
código del producto.

**Qué cambió.**

- **La tipografía queda confirmada:**
  `#workbench-type-is-self-hosted-inter-with-technical-features` pasa de
  `provisional` a `confirmed`. El agente la propuso por delegación y escribió su
  refutación en el registro; en el turno anterior le explicó al dueño qué se le
  preguntaba y lo que había en contra (Inter es una letra muy común y distingue
  poco la marca; cambiar la de los titulares pide una dependencia nueva y volver
  a medir el diseño), y el dueño la confirmó en el turno siguiente.
- **`F3` pasa a `(DONE)`:** `docs/ROADMAP.md` marca la fase hecha en su línea de
  orden y deja la lápida; el cuerpo, con sus cuatro partes y el criterio de
  cierre, va a `docs/archive/ROADMAP.md`. Ninguna fase queda en curso: la
  siguiente la abre el dueño.
- **Los documentos que la daban por pendiente lo dejan de decir:** `DESIGN.md` y
  `#visual-redesign-workbench-two-themes`.

**Cómo se verificó.**

- **Ninguna decisión viva nombra solo fases hechas:** la única que no está
  `confirmed` es `#typing-does-not-check-indexed-access-or-type-aware-lint`,
  que no nombra ninguna fase.
- **Las puertas:** `.\dev.cmd verify`, `RESULT: 9 puertas, 0 en rojo`, repetida
  hasta que el veredicto no cambió.

**Pendiente.** Nada de esta fase. Sigue abierto, sin fase, si el tipado se
endurece (`#typing-does-not-check-indexed-access-or-type-aware-lint`).
