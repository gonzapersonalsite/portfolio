# Arquitectura del producto

El producto es una aplicación React estática bilingüe con Vite, TypeScript y Material UI (en `frontend/`) organizada con
Feature-Sliced Design. Este documento manda sobre la forma del código de
`frontend/src`: dónde va cada cosa, qué puede importar qué y cómo se leen los datos y se accede a la red.
Cómo se trabaja en el repositorio lo manda `AGENTS.md`, y cómo se pone en
marcha un clon, `README.md`.

**Cada regla dice qué la hace cumplir.** Las que hace cumplir el lint tienen en
`frontend/eslint.config.test.ts` el caso más pequeño que las rompe, y ese test falla si
alguien relaja la regla en `frontend/eslint.config.js`. Las reglas de fsd-lint 1.2.1
no leen las reexportaciones (`export … from`), y `fsd/forbidden-imports`
tampoco lee el `import()` dinámico: en ellos sostiene los mismos límites una
regla local, `fsd-gaps/boundaries` (`frontend/eslint-fsd-gaps.js`), que sobra cuando
fsd-lint los lea. Ninguna regla lee un `import()` cuya ruta no esté escrita
entre comillas (una plantilla de texto, aunque no tenga huecos, o una
variable), ni un tipo que importa (`typeof import('…')` o `import('…').Tipo`):
lo que se importa así es convención, y `frontend/eslint.config.test.ts` tiene sus casos.
Un comentario no apaga ninguna regla: el lint da por aviso un
`eslint-disable`, y un aviso es rojo (`--max-warnings=0` en `pnpm --dir frontend run lint`),
así que una excepción vive en `frontend/eslint.config.js`, junto a su decisión. Las que
dicen «convención» no las comprueba nada: las sostiene la revisión del diff, y
se convierten en regla de lint con su caso en cuanto alguien encuentra cómo.

## Capas

`frontend/src` contiene estas seis carpetas y nada más, de arriba abajo:

| Capa | Qué contiene |
|---|---|
| `app` | La entrada (`frontend/src/app/main.tsx`), los providers, el router y los estilos globales |
| `pages` | Una pantalla entera: compone lo de debajo y guarda el código que solo usa ella |
| `widgets` | Un bloque de interfaz grande que usan varias páginas |
| `features` | Una acción del usuario con valor propio: un formulario, un selector de tema o idioma |
| `entities` | Un concepto del negocio: sus tipos, sus reglas, sus datos estáticos y su vista |
| `shared` | Lo que no sabe nada del negocio: configuración, utilidades, almacenamiento, la UI base |

- **Una capa solo importa de las que tiene debajo.** Lo hacen cumplir
  `fsd/forbidden-imports` y, en una reexportación o un `import()` dinámico,
  `fsd-gaps/boundaries`.
- **Dos slices de la misma capa no se importan entre sí.** Si los dos necesitan
  algo, ese algo baja a una capa inferior. Lo hacen cumplir
  `fsd/no-cross-slice-dependency` y, en una reexportación,
  `fsd-gaps/boundaries`.
- **No hay más capas.** Un fichero de código fuera de esas seis carpetas, o
  suelto en la raíz de `frontend/src`, es un error de `no-restricted-syntax`; carpetas
  como `services`, `hooks` o `utils` en la raíz no existen.
- **En `frontend/src` el código es TypeScript en `.ts` y `.tsx`** (más los JSON estáticos de contenido en `entities/<slice>/api/`): un `.js`, `.jsx`, `.mjs`, `.cjs`, `.mts` o `.cts` es un
  error de `no-restricted-syntax`, o un error de parseo (`Parsing error`) si
  contiene sintaxis de TypeScript o JSX.
- `app` y `shared` no tienen slices, por convención: sus carpetas internas son
  segmentos.

## Slices y segmentos

Un slice es una carpeta dentro de `pages`, `widgets`, `features` o `entities`
(`frontend/src/entities/<slice>/`), con nombre en kebab-case. Dentro, solo los
segmentos que tengan algo:

| Segmento | Qué contiene |
|---|---|
| `ui` | Componentes `.tsx` y sus estilos |
| `model` | Tipos, reglas de negocio como funciones puras, hooks y estado |
| `api` | Los datos estáticos del slice (`data.json` y sus getters síncronos) o el envío externo (`frontend/src/features/contact-form/api/contactApi.ts`) |
| `lib` | Utilidades internas del slice |
| `config` | Constantes del slice |

- **Desde fuera, a un slice solo se entra por su `<slice>/index.ts`**, que
  exporta a propósito lo que es público y nada más: ni un fichero interno ni
  un segmento (`@/entities/<slice>`, nunca `@/entities/<slice>/model`). Lo
  hacen cumplir `fsd/no-public-api-sidestep` y, en una reexportación,
  `fsd-gaps/boundaries`. A `shared` se entra por segmento (`@/shared/lib`), por
  convención.
- **Entre slices se importa con el alias `@/`**, y lo hacen cumplir
  `fsd/no-relative-imports` y, en una reexportación, `fsd-gaps/boundaries`.
  **Dentro del slice, con rutas relativas**, por convención: entrar en el
  propio slice por el alias, y más aún por su `<slice>/index.ts`, crea un ciclo
  de imports que el lint no ve. El alias se declara una sola vez, en
  `frontend/tsconfig.app.json`, y Vite, Vitest y `frontend/eslint.config.js` lo leen de ahí. Solo
  `@/` es el alias: un paquete con scope que empiece como una capa
  (`@app/tokens`) es un paquete, no la capa `app`.
- **En `model`, `api` y `lib` no hay UI**: ni ficheros `.tsx`, ni imports,
  estáticos o dinámicos, de un segmento `ui`, de estilos, de cualquier entrada
  de `react-dom` o de los runtimes de JSX, ni `createElement`, `cloneElement` o
  React entero (por defecto, como espacio de nombres o dinámico): de React se
  importa por nombre lo que es lógica, como sus hooks. Lo hacen cumplir
  `no-restricted-imports` y `no-restricted-syntax` sobre esos segmentos. Que
  no llegue un componente por la API pública de otro slice es convención: el
  lint ve rutas, no qué exporta cada una. Sus tests sí pueden renderizar.
- **Los tests van al lado de lo que prueban**, como `<fichero>.test.ts` o
  `<fichero>.test.tsx`, por convención, y las reglas de imports de
  Feature-Sliced Design no se les aplican: un test puede entrar en el slice que
  prueba.
- **Todo test corre y comprueba algo.** `.skip`, `.todo`, `skipIf` y `runIf`
  son errores de `no-restricted-properties` en los tests, y la puerta `tests`
  no admite ningún caso que el informe de Vitest dé por saltado
  (`--forbid-skipped`), también el que esa regla no lee. Vitest rechaza un
  `.only` (`allowOnly: false`) y hace fallar un test que no comprueba nada
  (`expect.requireAssertions`), los dos en `frontend/vite.config.ts`.

## Dónde va el código nuevo

Primero, en la página que lo usa. Baja cuando aparece el segundo consumidor, y
no antes: a `widgets` si es un bloque de interfaz, a `features` si es una
acción del usuario, a `entities` si es un concepto del negocio, y a `shared` si
no sabe nada del negocio. Bajar código es un cambio con su propio diff, que
deja los imports por la `<slice>/index.ts` del nuevo sitio. Es convención; el
lint solo impide que una capa use lo que tiene encima.

## Estilos

- Los estilos de interfaz usan Material UI (`sx` + tema en `frontend/src/shared/config/theme.ts`) y CSS co-localizado en `ui/`. Que no se importen
  estilos desde `model`, `api` ni `lib` lo hace cumplir el lint; el resto es
  convención.
- Los estilos globales de la aplicación viven en
  `frontend/src/app/styles/index.css`, que importa la entrada y nadie más, por
  convención.

## Datos y red

- **Contenido estático bilingüe:** todo el contenido de negocio vive en ficheros JSON versionados en el segmento `api` de cada entidad (`frontend/src/entities/<slice>/api/`), expuestos por getters síncronos y validados por tests de integridad.
- **Sin peticiones HTTP ad-hoc:** `fetch`, `XMLHttpRequest`, `window.fetch`, `globalThis.fetch` y `self.fetch` fuera de `frontend/src/shared/api` son errores de `no-restricted-globals` y `no-restricted-properties`. El único envío externo es el formulario de contacto (`frontend/src/features/contact-form/api/contactApi.ts`), que carga EmailJS bajo demanda con un tope estricto de 15 s.
- **Las reglas de negocio son funciones puras en `model`**, con su test en el
  mismo cambio; los hooks del modelo solo guardan estado y llaman a esas
  funciones. Convención.

## La superficie para agentes y buscadores

- **Lo que ven los crawlers y los agentes sale del build, con una sola
  fuente.** `frontend/src/shared/config/site.ts`, `frontend/tooling/agent-files/routes.ts` y los JSON de entidades definen la dirección del sitio, las rutas, los textos, los gemelos Markdown bilingües y las páginas HTML por ruta; el plugin
  cableado en `frontend/vite.config.ts` emite llms.txt, robots.txt, sitemap.xml, los gemelos Markdown y los shells HTML en `frontend/dist/` (y el servidor de desarrollo sirve
  los ficheros de agentes por middleware). Los tests de `frontend/tooling/agent-files` y `frontend/tooling/hosting/vercelConfig.test.ts`
  cruzan cada valor con los ficheros reales —la portada `frontend/public/og-cover-typographic-full-stack.jpg`, los iconos y el hash CSP del script inline de `frontend/index.html` incluidos— y comprueban que el plugin sigue cableado en la
  configuración real: quitarlo de `frontend/vite.config.ts` los deja en rojo.

## Nombres

Por convención: componentes en PascalCase, hooks
en camelCase con `use` delante, slices en
kebab-case y segmentos en minúsculas.
