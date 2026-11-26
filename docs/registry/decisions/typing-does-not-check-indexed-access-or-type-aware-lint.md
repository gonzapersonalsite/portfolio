---
title: El tipado aún no comprueba el acceso indexado ni el lint con información de tipos
state: open
date: 2026-11-26
domain: verification
phase: none
---
**Nadie ha decidido si el compilador y el lint deben ser más estrictos de lo que
son.** Hoy `frontend/tsconfig.app.json` compila con `strict`, sin locales ni
parámetros sin usar y sin caídas entre casos de un `switch`, y ESLint aplica las
reglas recomendadas de typescript-eslint, que no usan información de tipos. Quedan
fuera tres comprobaciones:

- noUncheckedIndexedAccess: leer `lista[i]` o `mapa[clave]` devuelve el tipo del
  elemento aunque el índice no exista. Activarla da 69 errores: 28 en el código del
  producto y de sus herramientas (10 en `ProjectGallery.tsx`) y 41 en los tests.
- exactOptionalPropertyTypes: distingue una propiedad ausente de una presente con
  valor `undefined`. Activarla da 3 errores.
- Las reglas de typescript-eslint con información de tipos (strictTypeChecked:
  promesas sin esperar, valores `any` que se cuelan, `switch` no exhaustivos). Exigen
  dar al lint el servicio de proyectos de TypeScript; no se ha medido.

Cae en `phase: none` porque es herramienta de desarrollo y no hay ningún tramo de
`docs/TOOLING.md` abierto: sería un tramo nuevo, que solo abre el dueño. Endurecerlo
cambia lo que exigen las puertas `typecheck` y `lint`, y arreglar los hallazgos toca
código probado; dejarlo como está es seguir confiando en los tests para los accesos
por índice.
