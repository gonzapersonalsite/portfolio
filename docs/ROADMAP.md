# Plan del producto (ordenado por dependencias)

**Principio de ordenación:** cada fase depende SOLO de lo ya construido (cero
trabajo especulativo). Cada fase añade una capa que las siguientes consumen.

**Fuente de decisiones:** `registry/README.md` (un fichero por decisión, citada
por identidad).

## Cómo leer este plan

- **El orden de trabajo, en una línea.** Los números son IDENTIDAD, no
  secuencia; aquí solo entran fases con número:

  **F0 ✔ → F1 ✔ → F2 ✔ → F3 (IN PROGRESS)**

  Esta línea es la única que enuncia la secuencia y lleva el cursor: en negrita,
  las fases unidas por `→` (o por `·`, que separa igual), y nada que no sea una
  fase de este plan con su marca; una candidata a fase o una duda se escriben en
  prosa o en su registro, y una puerta rechaza la línea que las nombra. La única
  marca de una fase hecha es `✔`, y la de la que está en curso,
  `(IN PROGRESS)`. **Cada fase se abre por orden explícita del dueño:** su
  cabecera pasa a `(IN PROGRESS)` y la línea lo dice.
  Renumerar está descartado: un número nuevo encaja en medio sin mover ninguno.
- **El marcador de estado de cada fase:** toda cabecera de fase termina en una
  sola palabra canónica entre paréntesis, `(DONE)`, `(IN PROGRESS)` o
  `(PENDING)`. `(DONE)` significa puertas en verde. Es lo ÚNICO que el
  validador de `../tools/board/` exige de las cabeceras de este documento.
- **Las partes las decide el dueño.** Un encargo que decide una parte no
  autoriza a inventar la siguiente para rellenar la forma: la fase lleva las
  partes decididas y una viñeta que diga qué sigue siendo suyo.
- **Lo que el dueño no dio se propone aparte.** Un corte de partes o un
  criterio de cierre que el encargo no trae entra como decisión `provisional`
  propia, citada desde la parte, nunca dentro del registro de lo dictado.
- **Una parte pasa a DONE con su entrega.** La marca quien entrega, en su
  nombre en negrita (`**Nombre — DONE.**`) y citando la entrega del registro en
  la misma viñeta; el dueño la revisa con el diff. La que se está haciendo
  lleva `— IN PROGRESS` en el nombre, y una sin marca está pendiente: lo que la
  prosa de la viñeta diga después no cuenta como marca, y una parte sin nombre
  en negrita no tiene dónde llevarla.
- **El plan lleva el alcance; el porqué de cada cifra o forma va a un
  registro** que la viñeta cita.
- **Lo que cierra se archiva y deja lápida:** una fase DONE deja aquí su
  cabecera y una sola viñeta que cita `archive/ROADMAP.md`, donde va su cuerpo.
- **Frentes sin fase:** un hueco que no caería en ninguna fase se escribe en su
  registro con `phase: none` y el motivo, y el tablero lo lista aparte (regla
  dura 5 de `../AGENTS.md`).

## F0 — Línea base del portafolio estático bilingüe (DONE)

- Cuerpo y entregas archivados en `archive/ROADMAP.md`.

## F1 — Escena del duende pixelado en el hero de Inicio (DONE)

- Cuerpo y entregas archivados en `archive/ROADMAP.md`.

## F2 — Rutas y shells HTML localizados por idioma (raíz en español y /en en inglés) (DONE)

- Cuerpo y entregas archivados en `archive/ROADMAP.md`.

## F3 — Rediseño visual («Mesa de Taller») y retirada incremental de Material UI (IN PROGRESS)

- **F3.1 — Galería nativa de proyectos — DONE.** Integración de `ProjectGallery` sobre `<dialog>` nativo con estilos propios y cero dependencias de Material UI o Emotion en `../frontend/src/entities/project/ui/` (`#visual-redesign-workbench-two-themes`, `#2026-11-25-native-dialog-project-gallery`).
- **F3.2 — Migración completa de `frontend/src/` a «Mesa de Taller» sin Material UI — DONE.** Tokens claro/oscuro (`tokens.css`) con respaldo pasivo ante `glass`, controles directos HTML de idioma y tema/animaciones (opción 2), cajón móvil nativo sobre `<dialog>`, tarjetas `Vista`/`Arquitectura`, skills con ejemplos aplicados, formulario y avisos propios (`#2026-11-25-mesa-de-taller-redesign-and-mui-source-removal`).
- **F3.3 — Identidad visual («Mesa de Taller» en favicon y tarjeta social), ajuste tipográfico y retirada de dependencias MUI/Emotion — DONE.** Iconos `g-workbench.*` y tarjeta social `frontend/public/og-cover-mesa-taller-gonzalo-martinez.jpg` alineados con «Mesa de Taller» (`#icon-keeps-the-g-monogram-dot`, `#github-social-preview-is-a-tolerated-copy`), rasgos OpenType técnicos de `Inter Variable` y cifras tabulares en `frontend/src/app/styles/index.css` (`#workbench-type-is-self-hosted-inter-with-technical-features`) y retirada definitiva de `@mui/*` y `@emotion/*` en `frontend/package.json` y `frontend/pnpm-lock.yaml` (`#2026-11-25-workbench-branding-and-mui-package-removal`).
- **F3.4 — Revisión transversal y acabado de «Mesa de Taller» — DONE.** Textos de toda la web contrastados con los repositorios y la experiencia real, datos JSON estrechados en su borde con tipos cerrados, esqueleto propio por página, áreas de trabajo en Inicio, enlace a Microsoft Store, alt social por idioma e impresión sin controles (`#2026-11-26-workbench-cross-review-and-finish`).
- **Pendiente para cerrar F3:** revisión visual final del dueño sobre las superficies actualizadas, en la que confirma o cambia la tipografía (`#workbench-type-is-self-hosted-inter-with-technical-features`), antes de dar `F3` por `(DONE)` y archivar la fase en `archive/ROADMAP.md`.
