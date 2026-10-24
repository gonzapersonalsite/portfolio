---
title: La etiqueta pública del portafolio es Full Stack Developer
state: provisional
date: 2026-10-24
phase: none
---
**La etiqueta pública del portafolio es Full Stack Developer, sin el adjetivo
junior.** El dueño eligió esta opción entre las que le puso el agente; no la
dictó. El nombre de marca sigue siendo `Gonzalo Martínez`; el footer y el
copyright usan el nombre legal completo `Gonzalo Martínez García`, que es la
firma común del resto de créditos. Lo que cambia es el puesto que la web
declara.

**Alcance.**

- El dato de perfil (`frontend/src/entities/profile/api/data.json`) cambia el
  subtítulo, el título de Sobre mí y la frase del resumen que decía «junior
  Full Stack developer»; el resto de la narrativa se mantiene, incluida la
  búsqueda de la próxima oportunidad y el crecimiento paso a paso.
- La interfaz y los metadatos (`frontend/src/shared/config/i18n.ts`,
  `frontend/index.html`), los shells y las copias para agentes
  (`frontend/tooling/agent-files/routes.ts`, el fichero de agentes llms.txt,
  los gemelos Markdown) usan `Full Stack Developer` / `Desarrollador Full Stack`.
- El footer del portafolio usa `profile.alternateName` como firma y copyright,
  para que coincida con los créditos de Kanban y Pokedex; el hero y la marca
  GONZALO.DEV conservan `Gonzalo Martínez`.
- La vista previa social se regenera con el nuevo puesto y un nombre de fichero
  nuevo, `og-cover-typographic-full-stack.jpg`, porque las plataformas sociales
  cachean por URL. La imagen anterior se retira.
- README, arquitectura y operaciones del repositorio reflejan el mismo puesto.
- No abre fase: es una decisión de marca y contenido que no cambia la
  arquitectura, las rutas ni el producto. Cae fuera de F2, ya cerrada.

## Refutación

- **Evidencia en contra:** `Junior` era el posicionamiento honesto del
  portafolio y el que mantenían el hero, el About y los metadatos. Quitarlo
  puede leerse como sobrevaloración, y el cambio toca 47 apariciones entre
  datos, SEO, shells, copias markdown, tests y documentación.
- **Lo que se mantiene y por qué:** el dueño pidió expresamente cambiar el
  portafolio a Full Stack; el resumen conserva la búsqueda de la próxima
  oportunidad y el crecimiento paso a paso, que siguen siendo ciertos. La
  alternativa era dejar `Junior` en el portafolio y usar `Full Stack` solo en
  los pies de Kanban y Pokedex, pero eso dejaba dos firmas distintas para la
  misma persona. Si el dueño prefiere recuperar `Junior`, se revierte el dato,
  los textos y la imagen en una sola parte; los tests de shells, gemelos y
  del fichero de agentes lo cubren.

2026-10-24: queda provisional hasta que el dueño vea el portafolio con el
nuevo puesto; entonces se confirma o se revierte.
