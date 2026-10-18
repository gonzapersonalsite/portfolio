---
title: Cuatro formas en que una herramienta que reescribe a ciegas perdió ficheros
date: 2026-09-21
origin: clayfarer
---
**Ninguna herramienta reescribe ficheros a ciegas** (regla dura 8 de `AGENTS.md`), y
la regla existe porque un repositorio ya perdió ficheros de cuatro maneras distintas:

1. Cmdlets de PowerShell 5.1 sobre ficheros UTF-8: leen y escriben en codepage ANSI,
   corrompen los acentos en silencio y meten BOM.
2. Un `sed` cuyo delimitador era el mismo carácter con el que empezaba el patrón:
   patrón vacío, así que reescribió TODAS las líneas.
3. Un `sed` direccionado por número de línea sobre un fichero que se había desplazado:
   machacó la fila de al lado, y nadie lo notó durante dos turnos.
4. Un `git checkout --` para deshacer una sonda sobre un fichero que llevaba trabajo
   sin commitear: lo borró entero.

**Regla:** una sonda se deshace con la edición inversa, no con git; se edita con las
herramientas del agente; `sed`/`perl` solo sobre un fichero que se acaba de leer y con
un patrón que no pueda casar de más; y los finales de línea los fija `.gitattributes`.
