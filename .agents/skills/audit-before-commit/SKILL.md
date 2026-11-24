---
name: audit-before-commit
description: Pasos para auditar desde cero lo que llevará un commit, en el árbol de trabajo y sin prepararlo, antes de pedírselo al dueño. Úsala al cerrar una parte, antes de proponer el mensaje del commit.
---
# Auditar antes de pedir un commit

Es una ayuda para ejecutar la auditoría que pide la regla dura 3 de
`AGENTS.md`, no una regla: qué se audita, y cuándo se commitea y se empuja, lo
dice el contrato. Donde esta skill discrepe, manda el contrato y esta skill se
corrige en el mismo cambio.

Nada se prepara (`git add`) antes de la autorización del dueño: se audita el
árbol de trabajo.

1. **Qué hay.** `git status --short`: lo que cambia, lo que no está versionado
   y, si algo aparece ya preparado, de quién es; lo que preparó otro no se
   toca.
2. **La parte, y nada más.** Esa lista y `git diff --stat`, contra lo que
   cuenta la entrega de la parte.
3. **El diff, fichero a fichero.** `git diff -- <fichero>` para cada uno, y
   cada fichero nuevo leído entero, buscando restos de una sonda, código
   comentado o un cambio que la entrega no cuente.
4. **Secretos.** Por ejemplo
   `git diff | grep -inE "api[_-]?key|secret|passw|token|private key"`, lo
   mismo sobre cada fichero nuevo, y cada coincidencia mirada a mano.
5. **Finales de línea.** `git ls-files --eol` sobre lo que se toca, y con
   `--others --exclude-standard` sobre lo nuevo: `w/lf`, salvo donde
   `.gitattributes` pide otra cosa.
6. **Las puertas sobre eso.** Si el árbol tiene cambios ajenos a la parte, se
   apartan con la edición inversa. Después, las puertas que el cambio puede
   mover, `./dev verify -- <etiqueta> [...]` (en Windows
   `.\dev.cmd verify -- <etiqueta> [...]`), en verde; los derivados que
   regeneren entran en la parte y se auditan con ella. Ante la duda de si una
   se mueve, se pasa; la completa la corre el hook `pre-push` al empujar.
7. **El mensaje.** Con la forma de la regla dura 3; el hook `commit-msg` lo
   comprueba al commitear.
8. **Pedirlo.** La parte en verde, lo auditado en el informe y el mensaje
   propuesto.
9. **Con la autorización.** `git add` de cada ruta auditada, por su nombre y
   nunca con `--all`; `git diff --cached --stat` tiene que decir lo mismo que
   se auditó; y el commit.
