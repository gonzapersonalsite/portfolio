---
title: Actualización a agentic-scaffold 0.6.0, migración del registro y parches de React
date: 2026-11-19
phase: none
---
**Objetivo y dueño:** herramientas de desarrollo, a petición del dueño, que
pidió dejar cada proyecto «correcto y final sin deuda tras todo cambio» y lo
delegó: «quiero que dejes tu todo remediado y aprobado y listo sin deuda, no te
cortes o dejes cosas sin hacer por mi, tienes carta blanca», y «toma las
decisiones pertinentes segun vaya tocando todo entra aprobado».
`templates` publicó `agentic-scaffold` 0.5.0 (`0bb820d`), con lo que clayfarer
aprendió, y 0.6.0 (`4948119`), en la que el registro dice lo que vale hoy; la
plantilla de React tomó los parches de noviembre. Este repositorio lo toma
todo con `upgrade.py` desde `d94a2b3` y migra su registro una vez.

**Qué cambió.**

- **Motor**, de 0.4.0 a 0.6.0: toma `verify.py`, `tools/board/board.py`,
  `tools/board/test_board.py`, `tools/board/adopt.py`,
  `tools/board/pre_push.py`, `tools/board/README.md` y
  `docs/registry/README.md`, y reescribe `tools/board/MANIFEST.txt` y
  `tools/board/components.txt`. Con 0.5.0, la verificación completa es la del
  hook de push y una sola corre por árbol; una provisional declara su fase y
  su criterio, y una fase hecha no deja nada suyo vivo. Con 0.6.0, toda
  decisión y toda lección declaran su `domain`, su cuerpo no lleva fechas, lo
  que nombran como código existe y lo que deja de gobernar sale por
  `docs/registry/retired.txt`.
- **A mano, de lo pendiente del plan:** `AGENTS.md`, la skill
  `audit-before-commit`, `tools/board/exceptions.txt` y
  `tools/board/limits.txt` toman el diff de la plantilla tal cual; las nueve
  semillas, su versión con dominio. `README.md` es del producto: su línea de
  `verify.py` dice la cadencia de 0.5.0.
- **Dominios** (`tools/board/domains.txt`): `brand` (marca, identidad
  pública, icono y vista previa social), `pixel-goblin` (la escena del hero,
  los portales y el panel de contacto) y `localization` (idiomas, rutas
  localizadas y shells HTML), más los tres de la plantilla, cada uno con su
  página en `docs/registry/index/`; el build borró los índices por fase.
- **Salen por el libro, como `applied`** por
  `#2026-10-24-install-policy-and-pnpm-pin`: las dos autorizaciones puntuales
  de esa entrega, fijar pnpm 12.15.0 y parchear Zod a 4.6.7. Las dos se
  cumplieron y no rigen nada hoy: el gestor ya iba en 12.16.1 y sube aquí a
  12.21.0, y Zod sigue en 4.6.7 en el lockfile.
- **Reescritas para decir lo que vale hoy**, sin sus líneas fechadas: el
  acento del apellido, el icono y la vista previa de GitHub dicen que el dueño
  eligió la opción y la confirmó tras leer su refutación; el puesto, que lo
  confirmó tras verlo; y la marca visible, lo que dictó. Las marcas web
  «gonzalo.dev» y «gonzalomartinez.dev» se escriben entre comillas y no como
  código, porque no son nombres del código. La decisión de adopción toma el
  texto de 0.6.0.
- **Herramientas de React**, a las versiones de la plantilla: pnpm 12.21.0,
  `vite` 8.3.8, `vitest` 5.1.1, `eslint` 10.15.0, `prettier` 3.10.1,
  `@vitejs/plugin-react` 6.3.0, `typescript-eslint` 8.73.0,
  `eslint-plugin-react-refresh` 0.5.8 y `typescript` 6.0.3, que deja el alias
  de `@typescript/typescript6` 6.0.2 por el paquete que la plantilla usa; la
  división de TypeScript se mantiene, con el 6 para las herramientas y
  `@typescript/native` 7.0.2 para compilar. `@types/node` sigue en 26.6.6, la
  versión propia de este repositorio. El lockfile se regeneró con los scripts
  de instalación desactivados: sale `@typescript/typescript6`, no entra ningún
  paquete y ninguno trae scripts de instalación.
- **Avisos de React en la puerta de tests**, que salían con el reporter
  junit con el que corre la puerta y no al correr un archivo solo; no se
  comprobó si ya salían sobre el commit de partida. En `ContactForm.test.tsx`,
  enfocar el mensaje a mano actualizaba el formulario fuera de `act`, y ahora
  va dentro. En `ProjectGallery.test.tsx`, el test del reintento movía el foco
  dos veces, al botón «Try again» y, al cargar la imagen, al de cerrar, y MUI
  monta sus ondas de pulsación de forma perezosa y las arranca o detiene
  cuando se resuelve una promesa, después del `act` síncrono; el test es ahora
  asíncrono y espera esas promesas dentro de `act`. Tres corridas de la
  puerta: 403 tests, sin aviso ni error.

**Cómo se verificó.** El árbol de partida estaba limpio. `upgrade.py`
planificó `5da2bf0c5453` sin conflictos, `--apply` lo escribió y `--done`
cerró las dieciséis cosas a mano. `board.py check` dio 28 comprobaciones y 0
hallazgos, sin ninguna excepción, y `python verify.py` en verde, en la cifra
que dice el commit que lo entrega.

**Pendiente.** Nada de esta parte.
