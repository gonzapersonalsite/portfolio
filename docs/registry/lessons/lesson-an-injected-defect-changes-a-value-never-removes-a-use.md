---
title: Para ver fallar un test, cambia un valor o una comparación; nunca quites el uso de un símbolo
date: 2026-09-21
origin: clayfarer
---
**Un test de regresión no vale hasta haberlo visto fallar con el defecto original
reintroducido, y el defecto tiene que ser ejecutable.** Reintroducirlo quitando una
llamada o dejando una variable sin usar, con los avisos elevados a error, produce un
error de compilación o de lint: la suite ni se ejecuta, y no se ha visto fallar nada.
Se ha visto un rojo distinto y se ha tomado por el que se buscaba.

**Regla.** El defecto de prueba cambia un VALOR o invierte una COMPARACIÓN; deshacerlo
es la edición inversa, no `git checkout`. Y lo que se apunta en la entrega es qué
defecto se reintrodujo y qué check lo cazó, no «visto fallar» a secas.
