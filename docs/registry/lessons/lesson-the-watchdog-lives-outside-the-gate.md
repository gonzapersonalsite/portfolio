---
title: Una guarda dentro del proceso no protege contra el proceso que no llega a construirla
date: 2026-09-21
origin: clayfarer
---
**Un vigilante de tiempo que vive dentro del proceso vigilado no cubre el caso en
que ese proceso nunca lo construye:** un error de parseo al arrancar deja el proceso
vivo, sin vigilante y sin veredicto, y quien lo lanzó espera para siempre.

**Regla.** El runner de puertas (`verify.py`) lanza cada puerta en su propio proceso,
la mata al superar el tiempo máximo y la cuenta como roja; todo camino de invocación
—atajos, hooks, scripts de la CI— pasa por ese runner, para que ninguna puerta corra
sin vigilante.
