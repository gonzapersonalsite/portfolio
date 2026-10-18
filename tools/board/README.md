# tools/board — tablero del proyecto

Herramienta que dice cómo va el proyecto **derivándolo del repositorio**, nunca
manteniéndolo a mano. Python 3 sin dependencias: `board.py` valida y genera,
`test_board.py` lo prueba, `adopt.py` escribe el primer registro de una
instancia, `instantiate.py` crea una desde la plantilla, `components.py` dice
qué incorporó además del motor (sus capas y las piezas de la plantilla de stack
de la que se creó, en `components.txt`) y cómo se pone al día, y
`commit_message.py` y `pre_push.py` son lo que corren los hooks. Es el motor único del andamio, sea
cual sea la tecnología del producto. Dueño: herramienta de desarrollo; no es una
fase del producto.

**Lo que pinta sale de lo que comprueba.** El validador es puerta, y el resumen y
los índices se derivan del mismo modelo que él valida: un tablero que pinta sobre
fuentes sin verificar afirma mentiras con total seguridad. En `verify.py` el build
corre justo antes que el validador, para que añadir un registro cueste una sola
corrida.

## Qué se abre

- `STATUS.txt`, en la raíz: el resumen en texto plano; lo primero que se lee al
  arrancar una sesión (`../../AGENTS.md` §5).
- `../../docs/registry/DECISIONS.md`: el índice principal de las decisiones.
  Enteras, las que piden trabajo (abiertas, deudas vivas, provisionales); del
  resto, la cuenta.
- `../../docs/registry/NOTES.md`: el índice principal de las entregas y las
  lecciones, con las más recientes de cada clase.
- `../../docs/registry/index/`: un índice por cada fase que nombran las
  decisiones, otro para las que no nombran ninguna, y uno por mes de notas.
  Todo registro está en alguno. El directorio es del tablero: un índice que ya
  no genera ninguna fuente es un hallazgo, y el build lo borra si lleva su
  huella; uno sin huella no lo borra, sale rojo y lo nombra.

Todos están **generados y versionados**: quien clona los abre sin ejecutar
nada. Cada uno lleva la **huella** de lo que dice y solo se reescribe cuando esa
huella cambia, así que su fecha responde «desde cuándo es verdad esto» y
`git status` no se llena de ruido. Lo que escriben es prosa en español, como los
mensajes del tablero.

## Ejecutar

```
python tools/board/board.py check   verde: "0 hallazgos" + exit 0
python tools/board/board.py build   verde: "BOARD_OK" + exit 0
python tools/board/board.py seal    solo en la plantilla: sella el motor en MANIFEST.txt
python tools/board/test_board.py    verde: "0 fallos" + exit 0
python tools/board/adopt.py         una vez, al instanciar: escribe la decisión de adopción
python tools/board/instantiate.py   desde la plantilla commiteada: crea una instancia, le añade una capa o crea un producto desde una plantilla de stack
```

`build` sale ROJO (`BOARD_RED`) cuando restaura un derivado que tocó una mano o
una herramienta: sin su huella, con su huella y otro texto, con una fecha
posterior a hoy (mañana se tolera, por los husos horarios), o guardado con BOM o
en otra codificación. Lo devuelve a lo que dicen las fuentes, con la fecha que
guardaba si es de fiar, y sale rojo esa vez para que la edición se vea en vez de
perderse en silencio. Por `verify.py`, eso cambia el veredicto dos veces (a rojo
y de vuelta a verde), y cada cambio pide otra corrida. También sale rojo, sin
escribir ni borrar nada, cuando un directorio de registros no se puede leer: un
índice pintado sin sus registros los perdería.

El build, el validador y los tests del tablero son puertas del repositorio, con
sus filas en `../../gates.txt`. Un cambio en el veredicto de las puertas hace
que `verify.py` vuelva a generar los derivados al final y salga con 1 pidiendo
otra corrida: el generador lee el veredicto de la tanda anterior
(`verdict.txt`, que `verify.py` reescribe solo tras una ejecución completa y solo
cuando el veredicto cambia, y que `adopt.py` vacía una vez, al instanciar).

`adopt.py` escribe, con la fecha del día, la decisión con la que un repositorio
adopta el andamio, y no reescribe una que ya exista. La plantilla no la trae
porque una copia arrastraría la historia de otro repositorio como propia; por lo
mismo, antes de escribirla vacía el veredicto y borra los derivados que la
plantilla traía sellados con sus fechas, y dentro de la propia plantilla se
niega. `instantiate.py` lo corre sobre la copia; sin `--apply` solo enseña su
plan.

Los hooks de `../../.githooks/` buscan un Python 3.8 o posterior de la misma
forma (`python.sh`) y llaman a dos scripts de aquí: `commit_message.py` juzga
el mensaje de un commit con los datos de `commits.txt`, y `pre_push.py` exige
que lo que se empuja sea el commit del árbol (HEAD), sin cambios versionados
sin commitear ni ficheros sin versionar, antes de correr las puertas y otra vez
después; un push que solo borra ramas remotas no publica nada que verificar y
pasa sin correrlas. Lo que `.gitignore` excluye no se compara, así que pasar
aquí no hace del árbol un clon: una puerta que lea algo ignorado (una caché, lo
restaurado, lo generado) lo prepara desde lo commiteado o lo rechaza cuando ya
no casa con ello.

## Qué lee

- Los **documentos vivos** que `documents.txt` declara (`live`).
- Los **registros** de `../../docs/registry/`: un fichero por decisión, lección y
  entrega, con cabecera de campos. El esquema es dato en `board.py` (`SCHEMA`,
  `STATES`) y se explica en `../../docs/registry/README.md`. Un fichero oculto
  (`.gitkeep`, que guarda en git un directorio vacío) no es un registro.
- Los **planes** que `documents.txt` declara con su eje (`axis`): cabeceras
  `## F6 — Título (MARCADOR)` con `DONE`, `IN PROGRESS` o `PENDING`, y una sola
  línea de orden en negrita con `→` o `·` entre fases (o con una sola fase,
  cuando el plan no tiene más). Una parte de la fase en curso dice `DONE` o
  `IN PROGRESS` como palabra entera en su nombre en negrita; sin marca, o sin
  nombre en negrita, está pendiente.
- Las **puertas** de `../../gates.txt`, con el mismo parser que `verify.py`:
  qué filas son runners de tests (`[harness]`) y qué guardas declara.
- Las **skills** de los directorios que `documents.txt` declara (`skills`): la
  cabecera YAML de cada SKILL.md y todo markdown que haya debajo.
- Los **adaptadores** que `documents.txt` declara (`adapter`): las líneas `@` de
  uno markdown, la lista `instructions` de uno JSON, y lo que su herramienta lee
  por sí misma.
- El **motor**: la versión y la huella de cada fichero del motor que declara
  `MANIFEST.txt`, y las rutas que solo tiene la plantilla.
- El **código** que `documents.txt` declara con su prefijo de comentario
  (`code`), solo para las citas `#<identidad>`: las de un comentario que ocupa la
  línea y las de uno que la cierra (el prefijo abre la línea o sigue a un
  blanco).
- Las **palabras del idioma del equipo** que declara `prose.txt`: las cabeceras
  de las secciones que lee por nombre y las que declaran un estado.
- El **árbol**. Con `.git` en la raíz, lo que lista `git ls-files` (lo
  versionado y lo no versionado que `.gitignore` no excluye), con un tope de
  30 s; si git falla, es un hallazgo y el árbol se recorre igual. Sin `.git`,
  un recorrido. En los dos casos se saltan `.git`, `node_modules`,
  `__pycache__`, `.venv`, los árboles `generated`, las cachés que se declaran
  con `CACHEDIR.TAG` (pytest, ruff, mypy) y los entornos virtuales de Python
  (los que llevan un pyvenv.cfg). Con git, un submódulo o un repositorio anidado
  es una carpeta del árbol, pero lo que hay dentro no: se cita la carpeta. Con
  git también lee el modo que el índice da a cada hook.
- **Solo la prosa.** Los bloques de código cercados, con tres o más comillas
  invertidas o virgulillas, no se leen: ni sus citas ni sus enlaces cuentan.
- **Todo como UTF-8 sin BOM.** Un documento, un registro, un fichero de datos o
  un derivado que no lo sea es un hallazgo `[data]` que lo dice. En un fuente
  de código declarado, un BOM es solo un aviso (hay editores que lo escriben) y
  unos bytes que no son UTF-8, un hallazgo `[encoding]` que se puede excusar
  mientras el fuente no se pueda convertir.

## Qué comprueba

1. **Todo fichero citado entre comillas existe, y todo enlace lleva a algo.**
   En los documentos vivos, en las decisiones que gobiernan, en las lecciones y
   en las skills; en la plantilla, también las citas entre comillas del
   markdown de sus rutas propias, que citan el motor. Un fragmento se lee como ruta solo si no puede ser otra cosa;
   resuelve si el árbol tiene una ruta que termina en él, y una ruta dentro de
   un árbol generado resuelve por estar ahí. Un enlace markdown resuelve como lo
   haría un visor: desde el directorio del documento que lo escribe (o desde la
   raíz si empieza por barra), entero y no por sufijo; una URL o un ancla no se
   miran.
2. **La línea de orden y las cabeceras de fase no se contradicen, en cada
   plan.** Toda cabecera termina en `(DONE)`, `(IN PROGRESS)` o `(PENDING)`;
   cada paso de la línea, entre `→` o `·`, es una fase de su plan con `✔` o su
   estado entre paréntesis como mucho; toda fase de la línea tiene sección; toda
   sección aparece en la línea; y el estado que da la línea es el que declara la
   cabecera.
3. **Todo documento vivo empieza por su título `# `.**
4. **Todo registro está bien formado.** Cabecera entre `---`, campos
   obligatorios presentes y ninguno desconocido, estado del esquema, fechas
   `AAAA-MM-DD`, fases que algún plan tiene, `phase` en toda abierta y en toda
   deuda viva, `criterion` en toda deuda, nombre de fichero que sea identidad.
5. **Una identidad nombra un solo registro**, entre los tres directorios.
6. **Toda cita `#<identidad>` resuelve a un registro.** En documentos vivos, en
   todos los registros y en los comentarios del código declarado, también los
   que cierran una línea de código.
7. **Cada documento conserva las secciones que este validador lee por nombre**
   (la tabla de autoridad del contrato, esta lista, la tabla de campos), con la
   cabecera que declara `prose.txt`. Una que falte o se repita allí es un
   hallazgo `[data]`, nunca un permiso para leer cualquier sección.
8. **Todo documento al que §4 del contrato da autoridad está declarado en
   `documents.txt`.** Lee la columna del fichero; un rango no es una ruta.
9. **Los derivados versionados dicen lo que hoy dicen las fuentes.** Renderiza en
   memoria y compara el texto entero, sellado con la fecha que el derivado
   guarda: uno que falta, uno viejo (con la huella de otras fuentes) y uno
   editado a mano (sin huella, con la huella y otro texto, o con una fecha
   posterior a hoy) son hallazgos distintos, y también un índice del directorio
   de índices que ya no genera ninguna fuente.
10. **Todo runner de tests lleva las guardas que declara `gates.txt`.** Una fila
    marcada `[harness]` corre algún fichero del árbol que lleva el nombre
    canónico de cada guarda, y una fila que corre un fichero con todas ellas
    lleva la marca. Es la mitad estática; `verify.py` exige además verlas
    impresas en la salida del runner, así que un docstring no basta. Cada
    guarda compara dos cuentas obtenidas por caminos distintos (declarado contra
    arrancado, arrancado contra terminado, terminado contra con-checks): una
    comparación que no puede ser falsa no es guarda, y `guard registered` exige
    al menos un test, porque un runner sin nada que ejecutar es rojo.
11. **Toda skill está bien formada y en el índice del contrato.** Cada carpeta de
    un directorio `skills` es una identidad con su SKILL.md, cuya cabecera YAML
    dice `name` (el de la carpeta) y `description` con valores que YAML lee como
    texto (sin comillas, uno con `: ` no lo es); cada skill tiene su línea en
    el índice del contrato, cuya cabecera declara `prose.txt`, y cada línea del
    índice es una skill que existe.
12. **Todo hook es ejecutable en el índice de git.** Con `.git` en la raíz, cada
    fichero sin extensión de `.githooks/` está en el índice como `100755`: git en
    Linux y macOS no corre un hook que no lo sea.
13. **El motor es el que trajo la plantilla.** Cada fichero `engine` de
    `MANIFEST.txt` tiene la huella con la que se selló, con los finales de línea
    plegados a LF; uno que cambió, que falta o que está sin sellar es un hallazgo
    `[engine]`, que una instancia excusa con su motivo cuando el parche es a
    propósito. `MANIFEST.txt` declara una versión `X.Y.Z`.
14. **Toda sección `(DONE)` de un plan es una lápida:** una sola viñeta que
    cita un archivo declarado `closed`.
15. **Lo que una sesión lee no pasa de su tope.** Las filas `startup` de
    `documents.txt` suman como mucho `startup` de `limits.txt`, y cada índice
    principal del registro pesa como mucho `index`. Los índices de cada fase y
    de cada mes no tienen tope: guardan la historia de algo que se cierra, y
    topar la historia programa la siguiente cirugía
    (`#lesson-a-cap-schedules-the-next-crisis`). El de `none` es la excepción:
    no se cierra nunca y una sesión lo consulta antes de tocar nada, así que
    lleva el tope de los principales, y cuando lo agota se decide cómo se
    parte, con los datos de ese registro.
16. **Cada adaptador lleva a su herramienta exactamente la lectura de
    arranque.** Lo que lista, más lo que su herramienta lee por sí misma, es la
    lista `startup`, una vez cada documento y en su orden, y lo que carga, con
    el propio adaptador si es markdown, no pasa del tope `startup`.
17. **Un documento intemporal no lleva fechas.** Su historia vive en registros
    que cita por identidad.
18. **Ningún registro pasa de sus topes de `limits.txt`:** su identidad, en
    caracteres (`identity`), y cada línea de su cuerpo (`line`).
19. **Todo fichero markdown del árbol tiene casa:** documento vivo o cerrado, plan,
    registro, derivado, adaptador o skill. El de una ruta que solo tiene la
    plantilla no la pide.
20. **La tabla de campos de `../../docs/registry/README.md` nombra exactamente
    los campos y los estados del esquema.**
21. **El nombre con el que abre el cuerpo de una decisión no declara estado:** la
    cabecera manda, y una copia en prosa se pudre cuando la cabecera cambia. Las
    palabras que cuentan son las que declara `prose.txt` y los estados del
    esquema en mayúsculas.
22. **Un documento intemporal solo se apoya en lo asentado:** cada cita
    `#<identidad>` que hace resuelve a una lección, a una entrega, a una
    decisión `resolved` (una pregunta cerrada es historia) o a una `confirmed`
    que no esté retirada. Una regla apoyada en una decisión provisional,
    abierta, postergada o descartada no tiene base, y una apoyada en una
    confirmada retirada la perdió.
23. **El contrato no conserva la sección por fusionar.** Al instanciar un
    repositorio que ya existía, su `AGENTS.md` queda entero bajo la cabecera
    que declara `prose.txt` (`pending`), y mientras esa sección siga en el
    contrato mandan dos contratos sin que nada diga cuál gana.
24. **Esta enumeración va de 1 a N y `board.py` corre N filas.** Ella misma es
    la última fila.

**Añadir una comprobación es añadir una fila** en `board.py` y su entrada aquí;
el número del informe es el tamaño de la lista.

## Ficheros de datos

- `documents.txt` — documentos vivos y cerrados, planes con su eje, directorios
  de registros, lectura de arranque y sus adaptadores, documentos intemporales,
  directorios de skills, código con su prefijo de comentario, árboles generados
  y extensiones de ruta.
- `exceptions.txt` — excepciones, cada una con su motivo al lado. Una sin motivo
  es un hallazgo, y una huérfana también.
- `limits.txt` — topes, con su motivo: el peso del arranque, el de cada índice
  que una sesión consulta antes de tocar nada, el largo de una identidad y el
  de una línea de registro. Subir uno es una decisión que se registra.
- `prose.txt` — las palabras del idioma del equipo que el tablero lee en la
  prosa. Un equipo que escribe en otro idioma las declara ahí, sin tocar el
  código.
- `commits.txt` — los tipos que puede abrir el asunto de un commit y los
  nombres de los agentes cuya firma no lleva ningún mensaje; una cuenta `[bot]`
  en un trailer también es una firma, se llame como se llame.
- `MANIFEST.txt` — la versión de la plantilla, la huella de cada fichero del
  motor y las rutas que solo tiene la plantilla, filas que la copia no lleva:
  son lo que distingue la plantilla de una copia. Lo sella `board.py seal`, y
  solo en la plantilla.

**Las claves de cada fichero viven en su propia leyenda, en inglés como todo
nombre, y el parser solo acepta esas.** La leyenda se abre con `# --- KEYS ---`
y la cierra el primer comentario vacío; qué hace cada clave lo dice esta página.

## Qué significa cada salida

- `[citation]` — un fichero citado que no está en el árbol.
- `[marker]` / `[order]` — cabecera sin marcador, o línea y cabeceras en
  contradicción, o una línea que nombra algo que no es una fase de su plan.
- `[record]` — un registro mal formado, con una identidad demasiado larga, o que
  repite su estado. No se excusa.
- `[slug]` — identidad repetida, o cita `#<identidad>` que no resuelve.
- `[shape]` — título ausente, sección leída que ya no existe, fecha en documento
  intemporal, línea larga, lápida ausente, esquema sin documentar, skill mal
  formada o fuera del índice, contrato que conserva la sección por fusionar, o
  arranque, adaptador o índice principal o de `none` por encima de su tope.
- `[derived]` — derivado que falta, viejo, editado a mano o que ya no genera
  ninguna fuente. No se excusa: se regenera.
- `[data]` — fichero de datos roto, `gates.txt` que `verify.py` no acepta,
  documento declarado inexistente, excepción sin motivo o huérfana, runner sin
  guarda o guardas sin marca, markdown sin casa, adaptador que no lleva a la
  lectura de arranque o que no se sabe leer, hook no ejecutable, fichero que no
  es UTF-8 sin BOM, o árbol que git no pudo listar.
- `[encoding]` — fuente de código declarado que no es UTF-8. Se excusa con su
  motivo mientras no se pueda convertir.
- `[engine]` — fichero del motor cambiado, ausente o sin sellar. Se excusa con
  su motivo cuando es un parche local a propósito.

## El límite de esta herramienta

El validador **vigila, no dicta**. De los documentos solo exige el marcador de
fase; de los registros, su cabecera. Si alguna vez obliga a reescribir prosa
para contentarlo, lo correcto es **retirarlo, no ablandarlo**: un validador
blando cobra la ceremonia y no da la garantía.
