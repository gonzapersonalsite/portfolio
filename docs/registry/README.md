# Registro — decisiones, lecciones y entregas

El conocimiento del proyecto que no es código vive aquí, **un fichero por
pieza**, en tres directorios:

| Directorio | Qué guarda | Cuándo se escribe uno |
|---|---|---|
| `decisions/` | Una decisión con su estado. Una decisión no existe hasta tener su fichero. | Al decidir algo, al detectar un hueco (`open`) o al anotar una deuda técnica. |
| `lessons/` | Algo que se aprendió y sigue valiendo. | Cuando un fallo enseñó algo que otro repetiría. |
| `deliveries/` | Qué se hizo, cómo se verificó y qué costó, en una parte entregada. | Al cerrar cada parte. |

`tools/board` lee los tres directorios, valida cada cabecera y genera los
índices, que no se editan: se regeneran con las puertas.

- `DECISIONS.md`, el principal de las decisiones: lista enteras las que piden
  trabajo —abiertas, deudas vivas y provisionales— y del resto solo da la
  cuenta. Así su tamaño sigue al trabajo en vuelo, no a la historia.
- `NOTES.md`, el principal de las entregas y las lecciones: las más recientes
  de cada clase.
- `index/`: un índice por cada fase que nombran las decisiones (con todas las
  suyas, sea cual sea su estado, y uno más para las que no nombran ninguna) y
  uno por mes con todas sus entregas y lecciones. Todo registro está en alguno.

## La forma de un registro

Cabecera de campos entre dos líneas `---`, y debajo el texto en prosa libre. Los
nombres de los campos y sus valores enumerados van en inglés; la prosa, en el
idioma del equipo (`../../AGENTS.md` §6). Una decisión:

```
---
title: La configuración vive en un fichero, no en variables de entorno
state: confirmed
date: AAAA-MM-DD
phase: F1
---
**La configuración vive en un fichero, no en variables de entorno.** Un
despliegue se describe entero en un fichero versionable; el entorno solo dice
cuál. Motivo, alcance y lo que NO cambia, en prosa.
```

Y una entrega, en `deliveries/AAAA-MM-DD-<tema>.md`, cuya identidad es ese
nombre entero, con la fecha:

```
---
title: La configuración se lee de un fichero
date: AAAA-MM-DD
phase: F1
---
**Objetivo y dueño:** producto; parte 2 de F1. Decisión: `#<identidad>`.

**Qué cambió.** Lo que entra y lo que sale, con sus ficheros.

**Cómo se verificó.** Qué defecto se reintrodujo y qué check lo cazó; el
veredicto de `python verify.py` al arrancar y al terminar, con sus cifras.

**Pendiente.** Lo que quedó fuera, con el registro que lo recoge.
```

- **La identidad es el nombre del fichero** sin `.md` (en una entrega, con su
  fecha delante): minúsculas, dígitos y guiones, en inglés como todo nombre, y
  como mucho los caracteres que dice `tools/board/limits.txt` (`identity`),
  porque con la ruta del clon una más larga no la versiona git en Windows. Se da una vez y **nunca se rederiva del
  título**: reescribir el título no rompe ninguna cita. Se cita como
  `` `#<identidad>` `` desde cualquier documento o comentario de código, y la
  puerta pone en rojo la que no resuelva.
- **Líneas normales**: el cuerpo se escribe a unas 80-90 columnas. Una línea
  larga es un hallazgo (`tools/board/limits.txt`, `line`).
- **La cabecera manda sobre el estado y la fecha, y el cuerpo no los repite.** El
  cuerpo abre con el título en negrita y sigue con la prosa; nada de
  `(CONFIRMADA ...)` ni `(CONFIRMED ...)` en el nombre: una puerta lo rechaza,
  con las palabras de estado que declara `tools/board/prose.txt` y los estados
  del esquema. Cuando cambia de estado, se cambia la cabecera y se añade al
  final del cuerpo una línea fechada que diga por qué. No se reescribe lo
  escrito: corregir un dato falso sí; cambiar por estética, no.

## Campos

| Campo | Decisión | Lección | Entrega | Valor |
|---|---|---|---|---|
| `title` | obligatorio | obligatorio | obligatorio | Una frase, sin markdown. |
| `state` | obligatorio | — | — | `confirmed` · `provisional` · `open` · `resolved` · `postponed` · `discarded`. |
| `date` | obligatorio | obligatorio | obligatorio | `AAAA-MM-DD` del estado actual (para una entrega, el día de la entrega). |
| `phase` | obligatorio si `open`, `postponed` o deuda viva | — | opcional | Ids de fase o tramo separados por espacio (`F1 H0`), o `none` con el motivo en el cuerpo. |
| `type` | opcional | — | — | `debt`: una deuda técnica, con su fase de pago en `phase` y su `criterion`. |
| `criterion` | obligatorio si deuda | — | — | Con qué se da por pagada, en una frase. |
| `retired` | opcional | — | — | `AAAA-MM-DD` desde el que ya no gobierna trabajo futuro. Sigue en su índice, bajo RETIRADAS. |
| `origin` | opcional | opcional | — | De dónde viene el registro cuando no nació en este repositorio: el repositorio de origen o la plantilla (`agentic-scaffold`). Su fecha es la que tenía allí. |

Los estados, sus reglas y las claves viven como datos en
`../../tools/board/board.py` (`SCHEMA`, `STATES`); añadir un campo o un estado
es añadir una fila allí y aquí, y una puerta cruza esta tabla con el esquema.

## Qué significa cada estado

- `open`: un hueco que el proyecto necesita cerrar y nadie ha decidido. Dice
  dónde caería (`phase`) para que esa fase tropiece con él.
- `provisional`: propuesta o cifra pendiente de que el dueño la confirme.
- `confirmed`: decidida por el dueño o por delegación suya. Gobierna trabajo
  futuro hasta que otra la sustituya (`retired`).
- `resolved`: una abierta que se cerró y se queda como rastro. Una deuda pagada
  es `resolved`.
- `postponed`: no se descartó, pero se aplazó; lleva su disparador en el cuerpo.
- `discarded`: rechazada, con el motivo, para no repetirla.

Los agentes **proponen**; solo el dueño confirma o cambia de estado, salvo
veredictos de las puertas. Cuándo y cómo se confirma lo manda la regla dura 9
de `../../AGENTS.md`.

## Qué lleva una entrada nueva

- **Decisión:** el enunciado, su alcance si lo tiene, y el motivo **solo cuando
  deshacerla parecería razonable y sería un error**. Una decisión registra UNA
  decisión.
- **Lección:** qué pasó, por qué engañó, y la regla que evita repetirlo.
- **Entrega:** objetivo y dueño (producto o herramienta), qué cambió, cómo se
  vio fallar el test, el veredicto de las puertas al arrancar (sobre qué commit)
  y al terminar, cifras medidas, y qué quedó pendiente con su registro. Lo que
  una entrega decide se registra como decisión aparte y se cita.

## Lo que llegó con la plantilla

Los registros con `origin` no nacieron aquí: son conocimiento que trajo la
plantilla, ya pagado en otro repositorio, y conservan la fecha de su origen. La
historia de este repositorio empieza con la decisión de adopción que escribe
`../../tools/board/adopt.py` el día que se instancia, y con la entrega de esa
parte; la de la plantilla no viaja con ella, y por eso el mismo script vacía el
veredicto y los derivados que la plantilla traía fechados.

## Cómo salen las cosas

Nada se borra. Una decisión que deja de gobernar cambia de estado o recibe
`retired` y sigue en su fichero, así que ninguna cita se rompe nunca. Las
entregas son historia y no salen. El coste de una sesión no depende del número
de registros: se leen los índices principales y se abren los ficheros que se
citan, o el índice de la fase que se va a tocar y el de `none`.
