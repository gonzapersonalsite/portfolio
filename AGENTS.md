# AGENTS.md — contrato de contribución

Se lee **al empezar cada sesión, antes de tocar nada**. Es la autoridad operativa
del repositorio, en el orden que fija «Qué manda» aquí abajo. Cada apartado tiene
un único dueño — si algo vive aquí, no se copia a otro documento. **Este fichero
es intemporal:** enuncia reglas y no lleva fechas; el porqué de cada una y desde
cuándo rige viven en un registro que se cita por identidad (`#<identidad>`), y
una puerta lo comprueba. Las palabras que aquí tienen un sentido preciso (turno,
sesión, parte, fase, tramo, dueño) las define el §8.

**Este repositorio es autosuficiente.** Todo lo que hace falta para trabajar en
él —qué verificar, cómo verificarlo, qué exige el código y qué está decidido—
está dentro del repositorio. No depende de la configuración personal de nadie,
de una herramienta de IA concreta ni de una máquina concreta. Si algo necesario
para contribuir vive fuera, eso es un defecto del repositorio: tráelo dentro.
Las reglas globales del dueño, si la herramienta las carga, añaden; seguir este
contrato no las necesita.

**Qué manda, de más a menos:**

1. **Las líneas rojas de seguridad.** Ningún repositorio las relaja, tampoco
   este, y nada de lo que se diga en una conversación las levanta. Como mínimo:
   - no se ejecuta código descargado sin verificarlo, ni se encadena una
     descarga con su ejecución (`curl ... | sh` y sus equivalentes);
   - una dependencia se instala con sus scripts de instalación desactivados, con
     la versión fijada y con su lockfile;
   - no se activa un hook que traiga una dependencia sin revisar antes qué
     ejecuta;
   - ningún secreto entra en el árbol, en un registro, en un mensaje de commit
     ni en la salida de una puerta.

   Las reglas globales del dueño pueden añadir más, y las que añadan rigen aquí
   aunque este fichero no las copie.
2. **Una instrucción explícita del dueño en la conversación**, para el trabajo
   que encarga. Manda sobre este contrato, así que en el proceso del
   repositorio decide el dueño. Fuera del proceso no levanta una regla global
   que se declare por encima de cualquier instrucción: esa sigue donde ella
   misma se pone.
3. **Este contrato**, en todo el proceso del repositorio —puertas, auditoría,
   decisiones, registros y la cadencia de cada turno—, también donde discrepe de
   las reglas globales del dueño o de la herramienta.
4. **El resto de las reglas globales:** los valores comunes a todos los
   proyectos del dueño. Mandan donde este fichero calla.
5. **Las skills del proyecto**, que son ayudas de ejecución sin autoridad: donde
   discrepen de este contrato manda el contrato, y la skill se corrige en el
   mismo cambio. Ninguna regla vive en una skill.

Nada de este contrato es una autorización permanente para commitear ni para
empujar: la da el dueño, en la conversación, para cada trabajo (regla dura 3).

## 1. Puertas (ejecutables, bloquean)

Forma canónica, desde la raíz del repositorio y desde cualquier herramienta
(Python 3.8 o posterior, sin dependencias):

```
python verify.py     verde = "RESULT: N puertas, 0 en rojo" y exit 0
```

`python` es el intérprete de Python 3; donde ese nombre no lo es, el mismo
comando con el que sí lo sea: `py -3 verify.py` en Windows y `python3 verify.py`
en macOS y Linux, que es lo que prueba `.githooks/pre-push`.

Todas en verde **antes de tocar nada** y otra vez **antes de decir que algo está
listo**. **Si al arrancar alguna está en rojo, no se construye encima:** se
reporta qué puerta y por qué, y arreglarla pasa a ser la parte del turno solo si
el dueño lo autoriza. **Una corrida que CAMBIA el veredicto no es verde**, aunque
ninguna puerta lo esté: el resumen cita el veredicto y se renderiza antes de que
este se escriba, así que `verify.py` regenera los derivados y sale con 1
diciéndolo; se vuelve a correr hasta que una corrida no lo cambie.

`gates.txt` es la lista ejecutable de puertas y la única: **cuáles son** se lee
ahí y ningún documento las enumera. Cada puerta corre en su propio proceso y se
vigila desde fuera, así que una colgada sale roja y una que falla no impide el
veredicto de las demás. Su fila declara los segundos que tarda, o `-` si aún no
están medidos; al pasar de su tope, el vigilante mata la puerta y lo que lanzó,
y el informe dice solo lo que comprobó. Cómo se calcula el tope y cuándo se
vuelve a medir una puerta, en la cabecera de `gates.txt`. Añadir una puerta es
añadir una fila. Para correr **una sola**, su etiqueta va después de `--`; sirve
para iterar, no para verificar. Los hooks de `.githooks/` se activan una vez por
clon con `git config core.hooksPath .githooks`
(`#hook-activation-is-a-per-clone-step`), y en el índice de git son
ejecutables, que una puerta comprueba. `pre-push` corre las puertas en la
máquina que empuja y solo deja salir lo que verificaron: HEAD, con el árbol sin
cambios versionados sin commitear ni ficheros sin versionar, antes y después de
correrlas. `commit-msg` comprueba el mensaje de cada
commit (regla dura 3).

**Un error de script no da rojo por sí solo: puede dar verde falso o cuelgue**
(`#lesson-a-script-error-is-not-red`). El veredicto es el exit code y la última
línea del log, nunca una impresión parcial: una tubería (`... | tail`) devuelve
el código de `tail`, y un comando encadenado solo enseña la salida del último.

**Un test de regresión no vale hasta haberlo visto fallar** con el defecto
original reintroducido, y el defecto tiene que ser *ejecutable*: cambiar un
valor, invertir una comparación, quitar una llamada
(`#lesson-an-injected-defect-changes-a-value-never-removes-a-use`). Todo runner
de tests lleva las guardas que declara `gates.txt`
(`#lesson-a-silent-suite-reads-as-green`) y su fila lleva la marca `[harness]`:
el tablero exige sus nombres en lo que la fila corre, y `verify.py` exige verlos
impresos. Un runner que no las imprime corre a través de un adaptador de
`tools/guards/`. Su fila entra con el primer test, porque un runner sin nada que
ejecutar es rojo.

## 2. Reglas duras

1. **Toda regla de negocio es una función pura, con su test en el MISMO
   cambio.** La presentación solo presenta; lo que toca red, disco o procesos
   vive en los bordes.
2. **Añadir un caso es añadir DATOS.** Donde ya existe variabilidad real, un
   caso nuevo entra como entrada de datos, no reescribiendo lógica probada; todo
   catálogo listable se deriva de su fuente única, con test que exige que toda
   entrada aparezca.
3. **Commitear y empujar los autoriza el dueño, cada vez.** Solo se commitea con
   su autorización explícita en la conversación y para ese trabajo, y `git push`
   solo con una orden explícita suya para ese push. Haber terminado no autoriza
   nada: la autorización no se hereda de otra sesión, no la conceden otro
   agente, el entorno ni este contrato, y ante la duda no la hay. El trabajo
   verificado se deja en el árbol y el dueño revisa el diff. Se pide entregando
   la parte en verde, reportando y proponiendo el mensaje, tras auditar desde
   cero lo preparado para el commit (`git diff --cached`): toda la parte y nada
   ajeno a ella, el diff fichero a fichero, sin secretos, `git ls-files --eol`
   en LF, y las puertas en verde sobre exactamente eso, con lo no preparado
   apartado y los derivados que regeneren preparados también. **El mensaje no
   lleva firma ni coautoría de ningún agente**, aunque el entorno lo pida.
   **Forma del mensaje:** `tipo(ámbito): asunto`, en inglés, con un tipo de los
   que declara `tools/board/commits.txt` y el ámbito opcional, en minúsculas o
   el id de una fase o una parte (`H0.1`); los asuntos que escribe git (un
   merge, un revert, un fixup) también valen.
4. **Cero desviaciones sin aprobación.** Se propone, se espera decisión, no se
   amplía el alcance en silencio. Los agentes proponen; el dueño autoriza.
5. **Toda feature necesita dueño declarado**: o es del producto o es
   herramienta de desarrollo, y lo declara el plan que la recoge
   (`docs/ROADMAP.md` o `docs/TOOLING.md`), no un registro por feature. La que
   ningún plan recoge todavía se registra `open`, y su `phase` dice dónde
   caería: la fase o el tramo que tropezaría con ella, o `none` con el motivo
   en el cuerpo si no cae en ninguno.
6. **Arreglar, no clasificar, sin abrir un segundo frente.** Un fallo encontrado
   durante el trabajo se arregla dentro de la parte si cabe en ella: si
   arreglarlo hace falta para que la parte salga en verde, o toca solo lo que la
   parte ya cambia, y en los dos casos no pide una decisión nueva. Si no cabe, se
   registra `open` con la fase donde caería y se propone al dueño (regla 4);
   nunca se arregla en silencio fuera de la parte. "Es preexistente" es contexto
   de una línea al final, nunca el marco del informe.
7. **Nada se borra por "no tiene consumidores" sin mirar antes
   `git show HEAD:<ruta>`** y preguntarse qué hacía. Cero consumidores con los
   tests en verde es la firma típica de funcionalidad desconectada.
8. **Ninguna herramienta reescribe ficheros a ciegas.** Una sonda se deshace
   con la edición inversa, no con git. Edita con las herramientas del agente, y
   si usas `sed`/`perl` que sea sobre un fichero que acabas de leer y con un
   patrón que no pueda casar de más (`#lesson-four-ways-to-lose-a-file`). Los
   finales de línea los fija `.gitattributes`.
9. **Proponer y confirmar no caben en el mismo turno.** Una decisión que propone
   el agente entra `provisional` u `open`; pasa a `confirmed` solo cuando el
   dueño lo dice, en un turno posterior, y entre medias hay una refutación
   escrita y una relectura de esa refutación con el trabajo delante. La
   refutación la escribe el agente que propone, en el cuerpo de la decisión bajo
   «Refutación», con la evidencia en contra y lo que se mantiene; la relectura
   la hace el dueño antes de confirmar. Lo que el dueño dicta en su encargo no
   es una propuesta: se transcribe `confirmed`, con su enunciado y sin
   inventarle el motivo. Lo que elige entre opciones que le puso el agente sí lo
   es, y su registro dice eso, no que lo dictó. **La separación se mide en
   partes entregadas, no en días:** un criterio de salida se escribe como el
   hito que lo cierra, nunca como una fecha. Y todo trabajo que entre en el
   árbol desde otra sesión u otro agente se inventaría antes de construir
   encima.

## 3. Estándares de código que exige este proyecto

No son preferencias de estilo: son propiedades que un cambio no puede degradar.

- **El dominio no depende de la infraestructura.** Si una regla de negocio no se
  puede probar sin levantar la infraestructura, está en el sitio equivocado.
- **Fuente única de conocimiento.** Dos piezas se unen solo si, al cambiar la
  regla de negocio, ambas deben cambiar juntas; si no, es coincidencia.
- **Flags describen datos; el comportamiento se encapsula.** Despachar conducta
  con ifs dispersos está prohibido: la conducta vive en estrategias o sistemas
  por etiqueta. Los ifs de guarda son correctos; el anidamiento tipo flecha y
  repetir el mismo despacho en varios sitios, no.
- **Parámetros booleanos prohibidos.** `f(x, true)` no dice nada en el punto de
  llamada: la firma expresa la intención.
- **Cero abstracción especulativa.** Solo se abstrae sobre variabilidad que ya
  existe o que está comprometida en los documentos. Una decisión abierta no es
  un compromiso.
- **Fallar pronto y sin mutar.** La entrada inválida se rechaza en el borde más
  externo posible; una operación que informa de fallo no deja estado a medias.
- **Todo camino de error tiene respuesta explícita.** Nada de fallos tragados.
- **El nombre dice la intención; el comentario es la excepción.** Un comentario
  solo se gana su sitio cuando deshacer esa línea parecería razonable y sería un
  error; donde la decisión está registrada, el comentario es un puntero corto
  (`#<identidad>`), nunca un resumen. Nada de código comentado "por si acaso".
- **Lo que toque red, disco o procesos** lleva timeout o cancelación; no se
  reintenta lo que no sea idempotente.
- **Un aviso del compilador o del linter es un error.** Cualquier silencio es
  una excepción registrada como decisión.
- **Las excepciones a este apartado no las concede el agente.** Siguen la regla
  dura 4: se propone, el dueño decide, y solo existe si queda registrada.
- **Las dependencias son exactamente las que fija `frontend/pnpm-lock.yaml`**: la puerta `dependencies` las instala sin red desde el almacén y la caché de pnpm de la máquina, y falla si el lockfile no casa con `frontend/package.json` o si a la máquina le falta algo de lo que fija. Cambiar una dependencia cambia los dos en el mismo cambio, y en una máquina nueva la primera instalación necesita red. Puerta: `dependencies`.
- **El formato del código lo fija Prettier** (`frontend/.prettierrc.json`), y no se discute en la revisión: lo que la puerta rechaza se arregla con `pnpm --dir frontend run format`. Puerta: `format`.
- **La arquitectura Feature-Sliced Design la hace cumplir el lint, no la revisión**: capas que solo importan hacia abajo, slices que no se importan entre sí y a los que solo se entra por su índice, nada de UI en `model`, `api` ni `lib`, en `frontend/src/` solo las seis capas y solo `.ts` y `.tsx`, ningún test saltado y ningún comentario que apague una regla. Cada regla tiene en `frontend/eslint.config.test.ts` el caso que la hace saltar, y `docs/ARCHITECTURE.md` cuenta el resto; un aviso de ESLint es un error. Puerta: `lint`.
- **TypeScript estricto**: `tsc -b` comprueba el código, sus tests y la configuración con `strict` y sin locales ni parámetros sin usar. Puerta: `typecheck`.
- **Toda regla de negocio tiene su test al lado de su fichero**, con Vitest y Testing Library, en el mismo cambio: la puerta `tests` lo corre con las guardas, y un test que no comprueba nada o un `.only` commiteado la dejan en rojo (`requireAssertions` y `allowOnly` en `frontend/vite.config.ts`). Puerta: `tests`.
- **La superficie para agentes y buscadores es parte del producto**: la dirección del sitio, sus textos, la portada, las rutas, las páginas HTML por ruta y los gemelos Markdown salen de `frontend/src/shared/config/site.ts`, `frontend/tooling/agent-files/routes.ts` y los JSON de contenido, y cambiar cualquiera de ellos actualiza sus tests en el mismo cambio. Puerta: `tests`.

**Una capa de tecnología** es lo que la tecnología del producto añade al
andamio, y solo puede añadir esto: filas de `gates.txt` con sus segundos de
referencia; viñetas de este §3, cada una con la etiqueta de la puerta que la
sostiene; un documento de arquitectura con su fila en el §4; filas de
`tools/board/documents.txt`; skills; y líneas de `.gitignore` para lo que
escriben sus herramientas. Entra cuando sus puertas pueden estar en verde: la
capa declara los ficheros sin los que no lo están (para un runner, el primer
test), y no se aplica mientras el producto no los tenga ni mientras lo que
escribe aquí cite algo que no existe. Lo que no sostiene una puerta no entra.

## 4. Dónde vive cada cosa (autoridad única)

| Para saber | Fichero | Manda sobre |
|---|---|---|
| Cómo se trabaja en este repositorio | `AGENTS.md` (raíz, este fichero) | **Contrato de contribución**: qué manda, puertas, reglas duras, estándares, protocolo e idioma |
| Qué es el producto y cómo se usa | `README.md` | Uso del producto y puesta en marcha de un clon |
| Qué se ha decidido, qué se entregó y qué se aprendió | `docs/registry/README.md` | **Todos los registros**: decisiones, entregas y lecciones, un fichero cada uno; sus índices son DERIVADOS |
| Qué fase toca y de qué depende | `docs/ROADMAP.md` | **Única autoridad de numeración de fases** del producto, y la gramática de los dos planes |
| Qué toca del andamio y en qué orden | `docs/TOOLING.md` | **Única autoridad de numeración de tramos** de herramienta |
| Qué comprueba el tablero y qué significa cada hallazgo | `tools/board/README.md` | Cómo se deriva el estado del proyecto; `STATUS.txt` y los índices del registro son DERIVADOS suyos |
| Cómo se organiza el código del producto | `docs/ARCHITECTURE.md` | **Arquitectura del producto**: capas, slices, imports, estilos y acceso a la red |

Ningún documento repite el contenido de otro. Si dos se contradicen, gana el de
la columna "manda sobre" y el otro se corrige en el mismo cambio.

- **Una fila es una línea, no un párrafo:** la tercera columna dice sobre qué
  manda ese documento y nada más. Este fichero se lee entero al empezar cada
  sesión, así que lo que engorda aquí se paga en todas.
- **Los documentos cerrados no tienen fila aquí:** un archivo cerrado no manda
  sobre nada. Cuáles hay lo dice `tools/board/documents.txt`, que es lo que la
  puerta lee.
- **Conocimiento que viva en dos sitios se resuelve de una de estas tres, y se
  escribe cuál:** una puerta que cruce las copias, el borrado de todas menos una,
  o una tolerancia registrada con su motivo y su disparador. Dejarlo sin decidir
  es lo prohibido. Repartir no es duplicar.
- **Cuando una decisión es además regla dura, cada fila manda sobre lo suyo:** el
  enunciado lo manda este fichero; que la decisión exista, su estado, su fecha y
  su autoría los manda su registro, que apunta aquí y no reenuncia la regla.

## 5. Protocolo de cada turno y de traspaso de sesión

1. **La lectura obligatoria del arranque es la que `tools/board/documents.txt`
   declara como `startup`**, en ese orden, y su peso total tiene tope en
   `tools/board/limits.txt`. Cada herramienta llega a ella por el adaptador que
   ese fichero le declara (sus filas `adapter`), y la que solo lee este
   contrato, desde esta línea: léela entera antes de seguir. Después, los documentos
   del §4 cuyo «Manda sobre» cubre lo que vas a tocar. **`STATUS.txt` orienta,
   no manda:** es el resumen que GENERA `tools/board` (fases, parte en curso,
   frentes abiertos, deudas y puertas); donde discrepe de un documento gana el
   documento. **Los registros se CONSULTAN, no se leen enteros:** por identidad
   cuando algo cita uno; por `docs/registry/DECISIONS.md`, que lista entero lo
   que pide trabajo; y, antes de tocar algo, por dos índices de
   `docs/registry/index/`: el de la fase o el tramo que lo gobierna y el de
   `none`, que reúne las decisiones que no nombran fase y valen para todo. Son
   la fuente de verdad: una decisión no existe hasta tener su fichero.
2. Todas las puertas en verde ANTES de tocar nada; si arrancan en rojo, el §1
   dice qué se hace.
3. Regla de negocio = función pura + tests en el mismo cambio.
4. **La sesión abre nombrando su objetivo:** las partes que el dueño encargó para
   ella y lo que queda fuera. **Un turno de trabajo cierra como mucho una parte,
   y abre nombrándola** con lo que queda fuera de ella; un turno que solo
   responde, propone o planifica no cierra ninguna, y lo dice. La parte se
   entrega en verde, se reporta y se espera: no se encadenan partes sin que el
   dueño haya visto la anterior, y nada ajeno al objetivo entra sin su
   autorización (reglas duras 4 y 6).
5. Todo cambio temporal se PROPONE antes de aplicarlo (regla dura 4): se
   registra como decisión `provisional` con motivo y reversión.
6. Documentación afectada, actualizada en el mismo cambio. **Cada parte
   entregada deja su entrega en `docs/registry/deliveries/`** —qué cambió, cómo
   se vio fallar el test, qué se midió— y una lección nueva en
   `docs/registry/lessons/` si el fallo enseñó algo. El relato no va al contrato
   ni a los planes: va a su registro.
7. **Nada se queda en la conversación.** Lo que se decide va a
   `docs/registry/decisions/` con su estado; lo que se aplaza va al plan que le
   corresponde, con su fase o su tramo; y un hueco —algo que el proyecto
   necesita y que nadie ha decidido— se registra `open` aunque no toque ahora,
   **diciendo en su campo `phase` dónde caería**, como en la regla dura 5. Una
   conclusión que solo vive en el chat se pierde al cambiar de sesión.
8. Cerrar el turno con **checklist de hecho / pendiente / de qué depende, y una
   conclusión**.

## 6. Idioma

**Un nombre o una clave va en inglés; un texto para leer va en el idioma del
equipo**, que en este repositorio es el español
(`#a-name-is-english-a-text-to-read-is-in-the-team-language`). Un caso nuevo se
decide preguntando qué es, no en qué fichero vive.

- **En inglés:** identificadores; nombres de fichero y de carpeta, también de
  documentos y registros; claves y valores enumerados de datos (campos y estados
  de un registro, marcadores de fase); etiquetas de puerta y de línea de salida
  (`RESULT:`); comentarios de código y de ficheros de datos; y mensajes de
  commit.
- **En el idioma del equipo:** la prosa de documentos y registros, con sus
  títulos y encabezados, y los mensajes que el código escribe para una persona.
- **Las palabras del idioma del equipo que el tablero lee** —las cabeceras de las
  secciones que lee por nombre y las que declaran un estado— son datos de
  `tools/board/prose.txt`: otro idioma se declara ahí. Los textos que escribe el
  propio andamio (sus mensajes y los derivados) están en español.
- **Un nombre heredado en otro idioma no es precedente.**

## 7. Verificar antes de afirmar

Los documentos no son prueba de lo que hace el código. Antes de proteger o de
dar por hecho un elemento porque un documento lo nombre, comprobarlo contra el
código. Si divergen, la deuda es la divergencia y se resuelve en el mismo
cambio. Antes de llamar defecto a un comportamiento, buscar el test que lo
enuncia: la intención vive también en los nombres de los tests.

## 8. Glosario

- **Dueño:** la persona que decide en este repositorio. **Agente:** quien
  propone y ejecuta, sea una persona o una herramienta de IA.
- **Turno:** una respuesta del agente a un mensaje del dueño. Es **de trabajo**
  cuando cierra una parte; el que solo responde, propone o planifica no cierra
  ninguna.
- **Sesión:** una conversación, de su primer mensaje al último; lo que solo
  vive en ella se pierde al acabar.
- **Objetivo de la sesión:** lo que la cierra: una o varias partes que el dueño
  encarga, nombradas al abrir con lo que queda fuera (el *objective* de las
  reglas globales).
- **Parte:** la unidad de trabajo verificada. Cabe en un turno de trabajo, se
  entrega en verde con su entrega en el registro y el dueño la ve antes de la
  siguiente (la *verified part* de las reglas globales). Se numera dentro de su
  fase o tramo: `H0.1` es la primera parte de H0.
- **Fase** (`F<n>`) y **tramo** (`H<n>`): una capa del producto en
  `docs/ROADMAP.md` y una propiedad del andamio en `docs/TOOLING.md`. El tablero
  y el campo `phase` de los registros los tratan igual.
- **Puerta:** una fila de `gates.txt`. **Verde:** sale con 0; el veredicto de
  todas es la última línea de `python verify.py`.
- **Registro:** un fichero de `docs/registry/` (decisión, lección o entrega)
  con cabecera de campos. Su **identidad** es el nombre del fichero sin `.md`
  (en una entrega, con su fecha delante) y se cita `#<identidad>`.
- **Derivado:** lo que escribe el tablero (`STATUS.txt` y los índices del
  registro); se regenera, no se edita.

## 9. Skills del proyecto

Una skill es un procedimiento repetible escrito para ejecutarlo paso a paso, en
`.agents/skills/<nombre>/SKILL.md` con una cabecera YAML (`name`, igual que su
carpeta, y `description`). No tiene autoridad («Qué manda», arriba). Este
índice es como se encuentran, porque no todas las herramientas leen esa
carpeta: una línea por skill con cuándo usarla, y una puerta exige que toda
skill esté aquí y que todo lo de aquí exista.

- **audit-before-commit** — al cerrar una parte, antes de pedir el commit:
  `.agents/skills/audit-before-commit/SKILL.md`
- **portfolio-conventions** — Convenciones del portafolio estático bilingüe (stack, modelo de contenido JSON estático, imágenes, enlaces y tarjetas de proyectos, rutas, estado, i18n, categorías de skills, temas, accesibilidad, testing, build y despliegue, superficie para agentes y seguridad). Úsala antes de cambiar código, contenido, tests o herramientas de build en `frontend/`, junto con `docs/ARCHITECTURE.md`: `.agents/skills/portfolio-conventions/SKILL.md`
- **react-fsd-maintainer** — Pasos para crear un slice, bajar código a otra capa o arreglar un hallazgo de arquitectura del lint en el producto React. Úsala al añadir código en src o cuando la puerta lint falle por una regla de arquitectura: `.agents/skills/react-fsd-maintainer/SKILL.md`
