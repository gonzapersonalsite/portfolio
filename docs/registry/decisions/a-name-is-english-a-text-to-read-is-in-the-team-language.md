---
title: Un nombre o una clave va en inglés; un texto para leer, en el idioma del equipo
state: confirmed
date: 2026-10-06
origin: agentic-scaffold
---
**Un nombre o una clave va en inglés; un texto para leer va en el idioma del equipo,
que por defecto es el español.** Propuesta del agente: una de las opciones de un
estudio de la plantilla que una segunda pasada verificó, y la que el dueño eligió
entre las que se le pusieron delante y dio por definitiva. El §6 de `AGENTS.md`
enuncia la regla con sus casos; aquí quedan su existencia, su autoría y su alcance.

**Alcance.** En inglés: identificadores, nombres de fichero y de carpeta (también de
documentos y registros), claves y valores enumerados de datos (campos y estados de un
registro, marcadores de fase), etiquetas de puerta y de línea de salida, comentarios de
código y de ficheros de datos, y mensajes de commit. En el idioma del equipo: la prosa
de documentos y registros, con sus títulos, y los mensajes que el código escribe para
una persona. Las palabras del idioma del equipo que el tablero lee en la prosa son
datos de `tools/board/prose.txt`; el andamio escribe sus propios textos en español.

**Lo que pesaba en la propuesta**, escrito por el agente y no por el dueño:

- La plantilla nació con nombres en español y un contrato que pedía nombres en
  inglés. Un agente copia los ejemplos, no la regla
  (`#lesson-the-examples-are-the-real-template`), así que cada instancia habría
  heredado la contradicción.
- El repositorio de origen ya había resuelto la misma pregunta así, y renombrar antes
  de la primera instancia no obligaba a migrar ninguna.
- Las otras opciones eran nombres en español con el §6 reescrito para decirlo, que
  chocaba con las reglas globales del dueño (nombres y comentarios en inglés), y una
  plantilla bilingüe con las claves traducidas por tabla, sin un segundo idioma que la
  pidiera.

**Refutación.** La escribió la segunda pasada del estudio, no este registro. Dio la
dirección por correcta y encontró fallos en la forma de aplicarla: copiar los nombres
del repositorio de origen traía rutas propias de ese proyecto, y su clave `plan`
significa allí otra cosa. Se mantiene la regla; la aplicación usa nombres genéricos y
la clave `axis`.
