---
title: Actualización a agentic-scaffold 0.3.3, con lo que aplica a un producto de convenciones propias
date: 2026-10-19
phase: none
---
**Objetivo y dueño:** herramientas de desarrollo, a petición del dueño.
`templates` publicó `agentic-scaffold` 0.3.3 y endureció la capa `react-vite` y
el stack `react-fsd` en el commit `16f1953` (etiqueta `agentic-scaffold-v0.3.3`);
este repositorio lo toma con `upgrade.py` desde `39bead6`. Sus convenciones, su
lint y su generador de ficheros para agentes siguen siendo suyos: de lo que
trae la plantilla toma el motor y lo que aplica a ellos.

**Qué cambió.**

- **Motor**, de 0.3.2 a 0.3.3: toma `tools/board/components.py`,
  `tools/board/test_board.py`, `tools/guards/junit.py` y `verify.py`, y reescribe
  `tools/board/MANIFEST.txt` y `tools/board/components.txt`. `verify.py`
  rechaza una fila de puerta que encadena comandos fuera de comillas dobles
  (`|`, `||`, un `&` suelto, `;`, un salto de línea) y dice exactamente qué mata
  su vigilante; `junit.py` admite `--forbid-skipped` y nunca da por verde un
  informe en el que no corrió ningún test.
- **La fila `tests` de `gates.txt`**, que cambió aquí (`--dir frontend`) y en
  la capa (`--forbid-skipped`), queda con los dos: la puerta corre en
  `frontend/` y queda en rojo con cualquier caso que el informe de Vitest dé por
  saltado. El commit anterior movió su base a `16f1953` para que el plan
  corriera.
- **`eslint-tests.js`**, que el stack trae ahora a sus piezas, llegó a la raíz,
  donde nada lo importa: el lint de este repositorio es el suyo, en
  `frontend/`. Por decisión del dueño queda como del producto (`--keep`) y se
  quita, sin dejar un fichero muerto.
- **La skill `react-fsd-maintainer` y `docs/ARCHITECTURE.md`**, que cambiaron
  aquí y en la capa, vuelven a su componente (`--done`) con su base en
  `16f1953` y su texto de aquí como cambio local. Las filas y los párrafos
  nuevos de la capa (globs, la excepción `@x`, conexiones y balizas, el sufijo
  único de test y las opciones de test) describen reglas que el lint propio de
  este repositorio no tiene, así que no entran; `docs/ARCHITECTURE.md` gana solo
  la frase de la puerta `tests` y su `--forbid-skipped`.
- **A mano, de lo pendiente del plan:** `AGENTS.md` toma el alcance exacto del
  vigilante, la regla de una fila un comando y, de los tres estándares que la
  capa reescribió, el de que todo test corre con `--forbid-skipped`; los de
  `lint` y de la superficie para agentes siguen siendo los suyos, porque lo son
  su lint y su generador. `gates.txt` toma la cabecera nueva; las referencias
  de sus filas siguen como se midieron.
- Los cambios de arranque que pide el CHANGELOG (los proyectos de
  `vite.config.ts` que lee `eslint.config.test.ts` de la plantilla, los `.spec`
  y las historias) son para un producto que lleva ese lint: este lleva el suyo,
  y no se tocan.

**Cómo se verificó.** `upgrade.py` planificó `7107d4d24b6a` sin problemas tras el
commit anterior, `--apply` lo escribió, `--keep` dejó `eslint-tests.js` en el
producto y `--done` cerró la skill, `docs/ARCHITECTURE.md`, `AGENTS.md` y
`gates.txt`. `python -I verify.py` pasó sus 9 puertas, y otra vez con el mismo
veredicto y sin cambiar ningún fichero.

**Pendiente.** Nada.
