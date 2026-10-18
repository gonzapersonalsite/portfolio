---
title: Un error de script no es rojo por sí solo, es verde falso o cuelgue
date: 2026-09-21
origin: clayfarer
---
**Un error en tiempo de ejecución dentro de un test o de una puerta no garantiza
un exit distinto de cero.** En muchos runtimes aborta solo la función donde ocurre y
el llamador sigue; el runner llega al final e imprime su veredicto sin los checks que
se perdieron. Y si el error aborta el arranque de un proceso que espera a que alguien
llame a «salir», ese proceso se queda vivo para siempre: cuelgue en vez de rojo.

**Regla.** El veredicto es el exit code y la última línea del log, nunca una
impresión parcial; cada runner cuenta lo que ejecutó y exige que todo lo declarado
terminase; y el vigilante del tiempo vive FUERA del proceso que vigila
(`#lesson-the-watchdog-lives-outside-the-gate`). Una tubería (`... | tail`)
devuelve el código de `tail`, no el de la puerta.
