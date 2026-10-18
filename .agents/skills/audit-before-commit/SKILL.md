---
name: audit-before-commit
description: Pasos para auditar desde cero lo preparado para un commit antes de pedírselo al dueño. Úsala al cerrar una parte, antes de proponer el mensaje del commit.
---
# Auditar antes de pedir un commit

Es una ayuda para ejecutar la auditoría que pide la regla dura 3 de
`AGENTS.md`, no una regla: qué se audita, y cuándo se commitea y se empuja, lo
dice el contrato. Donde esta skill discrepe, manda el contrato y esta skill se
corrige en el mismo cambio.

1. **Qué hay.** `git status --short`: lo preparado, lo que no y lo que no está
   versionado.
2. **La parte, y nada más.** `git diff --cached --stat`, contra lo que cuenta
   la entrega de la parte.
3. **El diff, fichero a fichero.** `git diff --cached -- <fichero>` para cada
   uno, leído entero, buscando restos de una sonda, código comentado o un
   cambio que la entrega no cuente.
4. **Secretos.** Por ejemplo
   `git diff --cached | grep -inE "api[_-]?key|secret|passw|token|private key"`,
   y cada coincidencia mirada a mano.
5. **Finales de línea.** `git ls-files --eol` sobre lo que se toca: `i/lf`.
6. **Las puertas sobre lo preparado.** Si `git diff` no está vacío, lo no
   preparado se aparta con la edición inversa. Después, `python verify.py`
   hasta que una corrida salga en verde sin cambiar el veredicto, y `git add`
   de los derivados que regenere.
7. **El mensaje.** Con la forma de la regla dura 3; el hook `commit-msg` lo
   comprueba al commitear.
8. **Pedirlo.** La parte en verde, lo auditado en el informe y el mensaje
   propuesto.
