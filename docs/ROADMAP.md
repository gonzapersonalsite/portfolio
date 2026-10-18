# Plan del producto (ordenado por dependencias)

**Principio de ordenación:** cada fase depende SOLO de lo ya construido (cero
trabajo especulativo). Cada fase añade una capa que las siguientes consumen.

**Fuente de decisiones:** `registry/README.md` (un fichero por decisión, citada
por identidad).

## Cómo leer este plan

- **El orden de trabajo, en una línea.** Los números son IDENTIDAD, no
  secuencia; aquí solo entran fases con número:

  **F0 ✔ → F1 (IN PROGRESS)**

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

## F1 — Escena del duende pixelado en el hero de Inicio (IN PROGRESS)

- **F1.1 — Duende pixelado sobre la tarjeta del hero de Inicio — DONE.**
  Personaje y animación de `gonzapersonalsite` integrados sobre el borde
  superior de la tarjeta del hero, sincronizados con su oscilación vertical y
  con pose de reposo al pausar o reducir el movimiento
  (`#hero-card-hosts-the-profile-pixel-goblin`,
  `#hero-goblin-scene-and-resting-pose`,
  `#2026-10-19-hero-card-pixel-goblin`).
- **F1.2 — Portales pixel 2D de entrada/salida y reutilización en Contacto — DONE.**
  Portales laterales de perfil que abren y cierran al paso del duende con
  recorte `<clipPath>`, y traslado del slice a
  `../frontend/src/widgets/pixel-goblin/` para compartirlo sin duplicación entre
  la tarjeta del hero de Inicio y el panel del formulario de Contacto
  (`#pixel-goblin-portals-and-contact-panel`,
  `#2026-10-19-pixel-goblin-portals-and-contact-panel`).
- Siguientes partes de `F1`, si las hubiera, y cierre de la fase: los decide el
  dueño tras revisar `F1.1` y `F1.2` y confirmar las decisiones provisionales.
