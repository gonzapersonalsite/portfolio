---
title: La activación de NutriManager pasa a segunda imagen y LinkedIn recibe los tres proyectos que faltaban
date: 2026-11-26
phase: none
---
**Objetivo y dueño:** producto; remata `#2026-11-26-nutrimanager-captures-and-profile-alignment`
con dos peticiones del dueño al ver el resultado publicado. No abre ni cierra
ninguna fase ni tramo.

**Qué cambió.**

- **Orden de las capturas de NutriManager:** el dueño preguntó «¿Por que es la
  imagen 3 de 5 y no la primera si es lo primero que sale al abrir?». La ventana
  de activación pasa de tercera a segunda, justo detrás de la portada, que es el
  sitio que tenía antes de rehacer las capturas. Primera no puede ir: la primera
  imagen es la portada de la tarjeta y el test de portadas la exige a `16:9`,
  y la ventana de activación mide `602×632`. Los ficheros cambian de nombre con
  el orden (`01-nutrimanager_activation` y `02-nutrimanager_person-details`) y
  `frontend/src/entities/project/api/data.json` los declara así; las imágenes no
  cambian.
- **LinkedIn, fuera del repositorio:** el perfil tenía cuatro proyectos y faltaban
  Gonzalo Apps, NutriManager y Pokédex. El agente redactó los tres con el estilo
  de los existentes y con datos de este repositorio, el dueño los aprobó («Sí,
  publícalos») y están publicados con sus enlaces y con aptitudes que el perfil
  ya tenía. La fecha de fin de NutriManager la propuso el agente a partir del
  historial de commits y el dueño no la corrigió.
- **GitHub:** el repositorio `portfolio` ya aparece como TypeScript.

**La revisión visual de `F3`.** El dueño, con el sitio publicado delante, dijo «yo
personalmente veo todo bien». La revisión visual queda dada; la tipografía no,
porque el dueño no llegó a leer qué se le preguntaba, así que
`#workbench-type-is-self-hosted-inter-with-technical-features` sigue `provisional`
y `F3` sigue en curso. `docs/ROADMAP.md` lo dice así.

**Cómo se verificó.**

- **Las imágenes:** las quince variantes existen con el nombre que
  `frontend/src/entities/project/api/data.json` declara y ningún fichero nombra
  ya los dos nombres anteriores.
- **Las puertas:** `.\dev.cmd verify`, `RESULT: 9 puertas, 0 en rojo`, repetida
  hasta que el veredicto no cambió.
- **LinkedIn:** releída la sección de proyectos después de guardar: los tres
  textos coinciden con los aprobados.

**Pendiente.** Que el dueño confirme o cambie la tipografía, que es lo único que
falta para cerrar `F3`.
