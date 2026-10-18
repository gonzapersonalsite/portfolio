---
title: Una suite que no ejecuta un solo check se lee exactamente igual que una verde
date: 2026-09-21
origin: clayfarer
---
**Una suite que corre y no informa nada se lee igual que una que pasó.** Visto de
verdad: un script bajo test no compilaba, cada llamada de la suite reventaba, y el
runner imprimió «0 fallos» con exit 0 porque contaba fallos y no comprobaciones. Los
57 checks de esa suite simplemente no estaban.

**Regla: todo runner lleva tres guardas, por su nombre canónico.**
`guard finished` (cada suite o función de test llegó a su final sin error de script),
`guard registered` (toda suite o función declarada se ejecutó, y hay al menos una:
un runner sin nada que ejecutar es rojo, y su fila entra en `gates.txt` con el primer
test) y `guard silent` (ninguna terminó sin ejecutar un solo check). Cada guarda
compara dos cuentas obtenidas por caminos distintos —lo declarado por reflexión
contra lo arrancado, lo arrancado contra lo terminado, lo terminado contra lo que
ejecutó checks—: una comparación que no puede ser falsa no es guarda, y se ve fallar
antes de entregarla. El tablero exige los tres nombres en cada runner declarado y
`verify.py` exige verlos impresos en su salida; lo que ninguno puede comprobar es que
la condición detrás sea la correcta, y eso se ve fallar a mano.
