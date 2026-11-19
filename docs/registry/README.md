# Registro — decisiones, lecciones y entregas

El conocimiento del proyecto que no es código vive aquí, **un fichero por
pieza**, en tres directorios:

| Directorio | Qué guarda | Cuándo se escribe uno |
|---|---|---|
| `decisions/` | Una decisión que gobierna hoy, con su estado. Una decisión no existe hasta tener su fichero. | Al decidir algo, al detectar un hueco (`open`) o al anotar una deuda técnica. |
| `lessons/` | Algo que se aprendió y sigue valiendo. | Cuando un fallo enseñó algo que otro repetiría. |
| `deliveries/` | Qué se hizo, cómo se verificó y qué costó, en una parte entregada. | Al cerrar cada parte. |

**Todo registro de `decisions/` y de `lessons/` que está en el árbol gobierna, y
lo que dice es verdad hoy.** La historia de cómo se llegó a él vive en las
entregas y en git, no en su cuerpo. Lo que dejó de gobernar salió y dejó su
línea en `retired.txt`, el libro de retiradas.

`tools/board` lee los tres directorios y el libro, valida cada cabecera y genera
los índices, que no se editan: se regeneran con las puertas.

- `DECISIONS.md`, el principal de las decisiones: lista enteras las que piden
  trabajo —abiertas, deudas vivas y provisionales—, del resto solo da la cuenta,
  y enlaza la página de cada dominio. Así su tamaño sigue al trabajo en vuelo,
  no a la historia.
- `NOTES.md`, el principal de las entregas y las lecciones: las más recientes
  de cada clase.
- `index/`: una página por dominio, con todas sus decisiones, sea cual sea su
  estado, y todas sus lecciones; es la que se consulta antes de tocar ese
  sistema. Y una por mes con todas sus entregas y lecciones.

## La forma de un registro

Cabecera de campos entre dos líneas `---`, y debajo el texto en prosa libre. Los
nombres de los campos y sus valores enumerados van en inglés; la prosa, en el
idioma del equipo (`../../AGENTS.md` §6). Una decisión:

```
---
title: La configuración vive en un fichero, no en variables de entorno
state: confirmed
date: AAAA-MM-DD
domain: configuration
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

**Cómo se verificó.** Qué defecto se reintrodujo y qué check lo cazó; qué
puertas se corrieron al arrancar y al terminar, y su veredicto, con sus cifras.

**Pendiente.** Lo que quedó fuera, con el registro que lo recoge.
```

- **La identidad es el nombre del fichero** sin `.md` (en una entrega, con su
  fecha delante): minúsculas, dígitos y guiones, en inglés como todo nombre, y
  como mucho los caracteres que dice `tools/board/limits.txt` (`identity`),
  porque con la ruta del clon una más larga no la versiona git en Windows. Se
  da una vez y **nunca se rederiva del título**: reescribir el título no rompe
  ninguna cita. Se cita como `` `#<identidad>` `` desde cualquier documento o
  comentario de código, y la puerta pone en rojo la que no resuelva.
- **Líneas normales**: el cuerpo se escribe a unas 80-90 columnas. Una línea
  larga es un hallazgo (`tools/board/limits.txt`, `line`).
- **La cabecera manda sobre el estado y la fecha, y el cuerpo no los repite.** El
  cuerpo abre con el título en negrita y sigue con la prosa; nada de
  `(CONFIRMADA ...)` ni `(CONFIRMED ...)` en el nombre: una puerta lo rechaza,
  con las palabras de estado que declara `tools/board/prose.txt` y los estados
  del esquema.
- **Un registro se reescribe.** Cuando lo que dice una decisión o una lección
  cambia, se cambia su texto para que diga lo que vale ahora, y la cabecera
  lleva la fecha de ese cambio; reescribirla para decir mejor lo mismo no
  cambia su fecha. Su cuerpo no lleva fechas ni el relato de cómo cambió: eso
  lo cuenta la entrega que hizo el cambio, que cita el registro, y lo conserva
  git. Una puerta rechaza una fecha en el cuerpo; citar una entrega, cuya
  identidad empieza por su día, no lo es. Una entrega no se reescribe:
  corregir un dato falso sí; lo demás es historia.
- **Lo que gobierna nombra código que existe.** Un nombre de código entre
  comillas invertidas en una decisión o una lección (con punto, con guion bajo,
  una llamada con sus paréntesis o una palabra que mezcla mayúsculas y
  minúsculas) tiene que estar en el código o en los datos del árbol, fuera del
  markdown; una puerta lo comprueba parte a parte. Un nombre de otro programa
  se excusa en `tools/board/exceptions.txt` con la clave `identifier` y su
  motivo; lo que no es código (un ejemplo de lo que no se hace, el nombre que
  algo llevará) no va entre comillas invertidas.

## Campos

| Campo | Decisión | Lección | Entrega | Valor |
|---|---|---|---|---|
| `title` | obligatorio | obligatorio | obligatorio | Una frase, sin markdown. |
| `state` | obligatorio | — | — | `confirmed` · `provisional` · `open` · `postponed` · `discarded`. |
| `date` | obligatorio | obligatorio | obligatorio | `AAAA-MM-DD` desde el que vale lo que el registro dice hoy (para una entrega, el día de la entrega). |
| `domain` | obligatorio | obligatorio | — | Un dominio de la lista cerrada de `../../tools/board/domains.txt`. |
| `phase` | obligatorio si `open`, `postponed`, `provisional` o deuda viva | — | opcional | Ids de fase o tramo separados por espacio (`F1 H0`), o `none` con el motivo en el cuerpo. |
| `type` | opcional | — | — | `debt`: una deuda técnica, con su fase de pago en `phase` y su `criterion`. |
| `criterion` | obligatorio si deuda o `provisional` | — | — | Con qué se da por pagada una deuda, o con qué se revisa una provisional, en una frase. |
| `origin` | opcional | opcional | — | De dónde viene el registro cuando no nació en este repositorio: el repositorio de origen o la plantilla (`agentic-scaffold`). Su fecha es la que tenía allí. |

Los estados, sus reglas y las claves viven como datos en
`../../tools/board/board.py` (`SCHEMA`, `STATES`); añadir un campo o un estado
es añadir una fila allí y aquí, y una puerta cruza esta tabla con el esquema.

**El dominio** dice de qué sistema es la regla, no quién la cita: es uno solo,
el de quien tendría que cambiar el registro si la regla cambiara. Una prueba
sobre el correo es del correo, y una regla sobre cómo se corren las pruebas, de
la verificación. Añadir un dominio es añadir una fila a `domains.txt`; los
ficheros no se mueven a carpetas y las identidades no cambian.

## Qué significa cada estado

- `open`: un hueco que el proyecto necesita cerrar y nadie ha decidido. Dice
  dónde caería (`phase`) para que esa fase tropiece con él.
- `postponed`: no se descartó, pero se aplazó; lleva su disparador en el cuerpo.
- `provisional`: propuesta o cifra pendiente de que el dueño la confirme.
  Dice con qué se revisa y qué fase la recoge, y no queda viva cuando todas
  las fases que nombra están hechas: se confirma, se descarta o pasa a una
  fase abierta.
- `confirmed`: decidida por el dueño o por delegación suya. Gobierna trabajo
  futuro mientras esté en el árbol.
- `discarded`: rechazada, con el motivo, para no repetirla. Sigue en el árbol
  porque ese motivo sigue gobernando.

Una deuda está **viva** mientras su registro está en el árbol y no está
descartada; pagarla es hacerla salir.

Los agentes **proponen**; solo el dueño confirma o cambia de estado, salvo
veredictos de las puertas. Cuándo y cómo se confirma lo manda la regla dura 9
de `../../AGENTS.md`.

## Qué lleva una entrada nueva

- **Decisión:** el enunciado, su alcance si lo tiene, y el motivo **solo cuando
  deshacerla parecería razonable y sería un error**. Lo medido y el cómo de la
  implementación van a la entrega. Una decisión registra UNA decisión.
- **Lección:** qué engaña y la regla que evita repetirlo. El caso concreto en
  que ocurrió lo cuenta la entrega, que la lección cita.
- **Entrega:** objetivo y dueño (producto o herramienta), qué cambió, cómo se
  vio fallar el test, qué puertas se corrieron al arrancar (sobre qué commit)
  y al terminar y su veredicto, cifras medidas, las palabras del dueño cuando
  decidió algo, y qué quedó pendiente con su registro. Lo que una entrega
  decide se registra como decisión aparte y se cita.

## Cómo salen las cosas

Una decisión o una lección que deja de gobernar **sale del árbol en el mismo
cambio** y deja una línea en `retired.txt`:

| Motivo | Cuándo | Qué nombra la línea |
|---|---|---|
| `superseded` | Otro registro dice ahora la regla. | El registro que la sustituye. |
| `answered` | Era una abierta y su respuesta vive en otro registro. | El registro que la responde. |
| `paid` | Era una deuda y se pagó. | La entrega que la pagó, si la hay. |
| `applied` | Era un trabajo de una vez o un plan, y está hecho. | La entrega que lo cerró, si la hay. |
| `withdrawn` | Ya no aplica y nada la sustituye. | Nada. |

Una abierta que se responde con una regla que conviene tener a mano no sale: se
reescribe como esa regla y pasa a `confirmed`.

Una puerta comprueba que una identidad del libro no existe como fichero, que lo
que su línea nombra existe, y que ningún documento vivo, registro que gobierna,
skill ni comentario de código la cita: quien la citaba pasa a citar a su
sustituta, o pierde la cita, en el mismo cambio. Las entregas sí pueden citarla,
porque son historia, y su cita resuelve por el libro. El texto de lo que salió
se lee en git. Las entregas no salen.

El coste de una sesión no depende de la historia: se leen los índices
principales, se abren los ficheros que se citan y, antes de tocar algo, la
página del dominio de lo que se toca.

## Lo que llegó con la plantilla

Los registros con `origin` no nacieron aquí: son conocimiento que trajo la
plantilla, ya pagado en otro repositorio, y conservan la fecha de su origen. La
historia de este repositorio empieza con la decisión de adopción que escribe
`../../tools/board/adopt.py` el día que se instancia, y con la entrega de esa
parte; la de la plantilla no viaja con ella, y por eso el mismo script vacía el
veredicto y los derivados que la plantilla traía fechados.
