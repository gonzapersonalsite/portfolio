---
title: Actualización a agentic-scaffold 0.8.2: los lanzadores dicen por qué se rechaza un plan
date: 2026-11-24
phase: none
---
**Objetivo y dueño:** herramientas de desarrollo; mantenimiento del andamio
encargado por el dueño para dejar cada repositorio consumidor en consonancia
con su plantilla. Lleva el motor de 0.8.1 (commit `80d58c7` del catálogo, la
entrega `#2026-11-24-scaffold-upgrade-to-0-8-1`) a 0.8.2 (commit `43ae5a7`,
etiqueta `agentic-scaffold-v0.8.2`), con los componentes `layer:react-vite` y
`stack:react-fsd` registrados en `d086d1e`, cuyas piezas el catálogo no
cambió. No abre ni cierra ninguna fase ni tramo, y no toca nada bajo
`frontend/` ni del despliegue. Palabras del dueño en el encargo: «todos los
projects deben quedar correctamente actualizados y alineados sin deuda» y
«puedes commit y push y debes».

**Qué cambió.**

- **Lo que tomó la herramienta (plan `1d679c402f04`, sin rechazos, conflictos
  ni pendientes a mano):** `tools/launcher/dev.ps1` y `tools/launcher/dev.sh`,
  que la plantilla cambió y la instancia no; reescribió
  `tools/board/MANIFEST.txt` (versión 0.8.2 y los dos sellos) y
  `tools/board/components.txt` (`applied` pasa a `43ae5a7`). Otros 25
  ficheros del motor estaban al día.
- **Componentes:** de `layer:react-vite`, 22 piezas y líneas al día y la
  skill `react-fsd-maintainer` con su parche local; de `stack:react-fsd`, dos
  al día, cinco con su parche local y las 16 que son del producto (`kept`),
  como las dejó `#2026-11-24-scaffold-upgrade-to-0-8-1`. Los dos siguen
  registrados en `d086d1e`.
- **Qué trae el motor:** cuando `verify.py` rechaza el plan de la corrida
  antes de correr ninguna puerta (una etiqueta que no es de ninguna puerta,
  por ejemplo), `dev.ps1` terminaba con un error de PowerShell y con 1 en
  lugar de con el código del plan, y `dev.sh` terminaba con el código correcto
  sin decir el motivo. Los dos dicen el motivo y terminan con el código del
  plan. Una corrida que no se rechaza no cambia.
- **Lo que no entra:** ninguna imagen, lockfile ni versión de dependencia.

**Cómo se verificó.**

- **Al arrancar:** árbol limpio e igual que el remoto en `7ffd58a`, commit que
  el hook `pre-push` verificó al publicarlo con `RESULT: 9 puertas, 0 en
  rojo`.
- **El caso que arregla:** `.\dev.cmd verify -- no-such-gate` imprime
  `RESULT: etiquetas desconocidas -> no-such-gate` con la lista de las 9
  puertas y sale con código 1, sin error de PowerShell.
- **Al terminar:** `.\dev.cmd verify`, `RESULT: 9 puertas, 0 en rojo`,
  repetida hasta `RESULT: BOARD_OK, sin cambios`.

**Pendiente.** Nada de esta actualización.
