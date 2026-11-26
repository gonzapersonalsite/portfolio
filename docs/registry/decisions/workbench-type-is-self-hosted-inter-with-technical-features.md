---
title: La tipografía de «Mesa de Taller» es Inter Variable autoalojada con rasgos técnicos
state: provisional
date: 2026-11-26
domain: interface
phase: F3
criterion: En la revisión visual final de F3 el dueño confirma esta tipografía o pide otra antes de cerrar la fase.
---
**La interfaz usa Inter Variable autoalojada y fijada (`@fontsource-variable/inter` en
`frontend/package.json`), con las variantes técnicas `cv02`, `cv03`, `cv04` y `cv11`
y cifras tabulares en fechas, etiquetas y chips
(`frontend/src/app/styles/index.css`); las etiquetas técnicas y el código usan la pila
monoespaciada del sistema (`frontend/src/app/styles/tokens.css`).** El dueño delegó la
elección («de fuentes te dejo elegir lo que encaje mejor») y la hizo el agente, así
que es una propuesta hasta que el dueño la confirme (regla dura 9).

Se elige porque no añade dependencias ni orígenes: el paquete ya estaba fijado en el
lockfile, `vite-plugin-font-preload` lo precarga y la CSP no tiene que abrir otro
origen de fuentes. Las cifras tabulares alinean fechas y contadores, que la retícula
de «Mesa de Taller» pone en columna.

**Refutación.** Inter es la letra por defecto de muchísimos sitios, así que apenas
distingue la identidad «Mesa de Taller»: los titulares podrían tener una letra con
más carácter. La pila monoespaciada del sistema cambia de cara y de medidas según el
sistema operativo (Consolas en Windows, Menlo en macOS, DejaVu Sans Mono en Linux), y
las comprobaciones de desbordamiento a `320 px` con letra a `24 px` se midieron solo
con Chrome en Windows. Se mantiene porque una letra de titulares propia exige una
dependencia nueva, la confirmación del dueño y volver a medir el desbordamiento, y la
diferencia entre sistemas no ha dado ningún desbordamiento en las medidas hechas.
