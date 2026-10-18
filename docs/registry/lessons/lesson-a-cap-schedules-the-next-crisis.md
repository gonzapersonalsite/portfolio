---
title: Un tope de bytes sobre un monolito no acota el crecimiento, programa la próxima cirugía
date: 2026-09-21
origin: clayfarer
---
**Un tope de bytes sobre un fichero que crece por diseño no acota nada: fija la fecha
de la siguiente intervención manual.** Medido en el proyecto de origen: el registro de
decisiones pasó de 6 KB a 606 KB en diez días con todas las puertas en verde, y cada
estallido del tope se resolvió con cirugía a mano o subiendo el número. Ninguna de esas
acciones cambió la pendiente, porque la causa era la forma —una entrada era una línea
de prosa de 2 a 5 KB cuyo estado un validador adivinaba— y no el volumen.

**Lo que sí acota es la forma.** Un fichero por pieza con una cabecera de campos hace
que el crecimiento sea «más ficheros», que un índice se derive en vez de mantenerse,
que el ciclo de vida sea un campo en vez de una heurística, y que una sesión pague solo
lo que abre. El único tope que sigue teniendo sentido es el del contexto que se lee al
arrancar, porque ese sí es un coste por sesión.

**Regla:** cuando un fichero necesite un tope, preguntar primero por qué crece por
diseño; si la respuesta es «porque las reglas de nacimiento son obligatorias y las de
muerte son de juicio», la solución es cambiar la unidad de almacenamiento, no el
número.
