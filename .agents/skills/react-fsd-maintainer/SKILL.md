---
name: react-fsd-maintainer
description: Pasos para crear un slice, bajar código a otra capa o arreglar un hallazgo de arquitectura del lint en el producto React. Úsala al añadir código en src o cuando la puerta lint falle por una regla de arquitectura
---
# Mantener la arquitectura del producto React

Es una ayuda para ejecutar, no una regla: qué va en cada capa, qué puede
importar qué y qué hace cumplir cada regla lo dice
[docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md), y cómo se trabaja, `AGENTS.md`.
Donde esta skill discrepe, mandan ellos y esta skill se corrige en el mismo
cambio.

## Crear un slice

1. **La capa.** Sigue «Dónde va el código nuevo» de
   [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md): lo nuevo empieza en la
   página que lo usa, y baja a un slice propio cuando aparece el segundo
   consumidor.
2. **La carpeta.** `src/<capa>/<slice>/`, en kebab-case, con solo los segmentos
   que vayan a tener algo.
3. **La API pública primero.** Escribe `<slice>/index.ts` con lo que otros
   slices van a usar, y nada más.
4. **Las reglas de negocio**, como funciones puras en `model`, con su test al
   lado (`<fichero>.test.ts`) en el mismo cambio; los componentes en `ui`, con
   su CSS Module y su test al lado (`<Componente>.test.tsx`).
5. **Las puertas.** `pnpm run lint`, `pnpm run typecheck` y `pnpm run test`
   para iterar; `python verify.py` antes de dar la parte por lista.

## Bajar código a otra capa

Cuando una segunda página, widget o feature necesita algo que vive en otro
slice:

1. Elige el destino con la misma sección de
   [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md): la capa más alta que esté
   por debajo de todos los consumidores.
2. Mueve los ficheros con `git mv`, con sus tests, para que el diff enseñe un
   traslado y no un borrado y una copia.
3. Exporta lo movido desde la `<slice>/index.ts` de destino y quítalo de la de
   origen.
4. Cambia cada import al nuevo `@/<capa>/<slice>`, y busca la ruta vieja en
   `src` hasta que no quede ninguna.
5. Las puertas en verde, y en el mismo cambio, la documentación que nombrara la
   ruta vieja.

## Arreglar un hallazgo de arquitectura del lint

Lo que pide cada regla de `frontend/eslint.config.js`; el caso que la hace saltar está
en `frontend/eslint.config.test.ts`.

| Regla | Qué encontró | Arreglo |
|---|---|---|
| `fsd/forbidden-imports` | Un import de una capa de arriba | Baja lo compartido a una capa inferior, o pásalo desde arriba como prop o argumento |
| `fsd/no-cross-slice-dependency` | Un import de un slice hermano | Baja lo común a una capa inferior, o compón los dos slices en la capa de encima |
| `fsd/no-public-api-sidestep` | Un import que entra en un slice sin pasar por su índice | Exporta lo que hace falta desde `<slice>/index.ts` e importa `@/<capa>/<slice>` |
| `fsd/no-relative-imports` | Una ruta relativa que sale del slice | Usa el alias: `@/<capa>/<slice>` |
| `fsd-gaps/boundaries` | Lo que las cuatro de arriba encuentran en un import, en una reexportación (`export … from`); o un `import()` dinámico de una capa de arriba | El arreglo de la fila de fsd-lint que dice lo mismo de un import; el mensaje dice qué límite cruza |
| `no-restricted-syntax` | Un fichero fuera de las seis capas o que no es `.ts` ni `.tsx`; en `model`, `api` o `lib`, un `.tsx` o un import dinámico de UI o de React | Mueve el fichero a su capa y a TypeScript, o el componente a `ui`; de React, importa sus hooks por nombre |
| `Parsing error` (sin regla) | Un `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts` o `.cts` en `frontend/src` con TypeScript o JSX | Renómbralo a `.ts` o `.tsx` en su capa |
| `no-restricted-imports` | UI, estilos, `react-dom`, un runtime de JSX o React entero en `model`, `api` o `lib` | Que el modelo devuelva datos y la vista los pinte desde `ui`; de React, importa sus hooks por nombre |
| `no-restricted-globals`, `no-restricted-properties` | Un `fetch` o un `XMLHttpRequest` fuera de `frontend/src/shared/api` | Llama al cliente HTTP desde el segmento `api` del slice |
| `no-restricted-properties`, en un test | Un test que no corre: `.skip`, `.todo`, `skipIf` o `runIf` | Haz que pase o bórralo |

Un hallazgo no se silencia relajando `frontend/eslint.config.js` ni con un comentario
`eslint-disable` (ver [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md)): un
silencio es una excepción, y las excepciones las decide el dueño (§3 de
`AGENTS.md`).
