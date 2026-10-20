---
name: portfolio-conventions
description: Convenciones del proyecto del portafolio estático bilingüe (stack, modelo de contenido JSON estático, imágenes, enlaces y tarjetas de proyectos, enrutado, estado, i18n, categorías de skills, temas, accesibilidad, pruebas, build y despliegue, salida legible por agentes, seguridad). Úsala antes de cambiar código, contenido, pruebas o herramientas de build en frontend/, junto con la arquitectura en docs/ARCHITECTURE.md y ARCHITECTURE.md.
---

# portfolio-conventions

## Propósito

Esta skill documenta las decisiones propias de la aplicación Portfolio. La arquitectura de `src` (capas, slices, importaciones, estilos, datos y red, y qué hace cumplir cada regla) no se repite aquí: vive en `docs/ARCHITECTURE.md` (y en `ARCHITECTURE.md` → *Feature-Sliced Design Rules* en la raíz del repositorio), y la skill `react-fsd-maintainer` recoge los procedimientos que la aplican. Carga esta skill junto a ellas cuando trabajes en este proyecto.

## Stack

| Categoría | Elección |
|---|---|
| Librería de UI | MUI (Material UI) |
| Enrutado | React Router DOM |
| Estado (UI) | React Context API |
| Formularios | componentes controlados simples |
| i18n | i18next + react-i18next |
| Correo | EmailJS |
| Pruebas | Vitest + Testing Library |
| CSS | prop `sx` de MUI + Emotion + CSS co-localizado en `ui/` |
| Tipografía | Inter Variable vía `@fontsource-variable/inter`, subconjunto latin precargado en el build; sin CDNs externos de fuentes |

Las versiones viven en `frontend/package.json`; no las dupliques en la documentación.

## Arquitectura (contenido estático)

El portafolio es un **frontend completamente estático**. No hay backend, ni cliente HTTP, ni estado de servidor.

- Todo el contenido de negocio vive en **ficheros JSON estáticos** co-localizados en el segmento `api/` de cada slice de entidad:
  - `entities/project/api/data.json`
  - `entities/profile/api/data.json`
  - `entities/skill/api/data.json`
  - `entities/experience/api/data.json`
  - `entities/spoken-language/api/data.json`
- El segmento `api/` es la **capa de acceso a datos**: los ficheros `*.ts` en `api/` importan el JSON y exponen getters síncronos simples (`getAllProjects()`, `getFeaturedProjects()`, `getProfile()`, `getSkillGroups()`, `getCoreSkills()`, `getAllExperiences()`, `getAllSpokenLanguages()`). El `index.ts` de un slice exporta únicamente los getters que usan otras capas (`getAllSkills()` permanece interno al slice `skill`).
- El contenido es **bilingüe por diseño**: cada campo de texto traducible es un par En/Es (`titleEn`/`titleEs`). Las tecnologías, las categorías de skills (traducidas mediante i18n), las URLs, `logoText` y `alternateName` tienen un único valor. El cambio de idioma solo vuelve a renderizar.
- Añadir o editar contenido = **editar el JSON** (cambio de datos, no de código). Sin CMS ni panel de administración.
- La integridad de los datos la imponen pruebas co-localizadas (`entities/<entity>/api/data.test.ts`): validan el contrato de campos, el orden, que cada imagen referenciada exista en `public/images/` y que ninguna imagen de proyecto se publique sin usar.
- Todas las imágenes están **autoalojadas** en `frontend/public/`: imágenes de contenido bajo `images/` (carpetas de proyectos, `profile/`, `no-image.svg`), iconos bajo `icons/`, y la vista previa social y el fallback de perfil en la raíz. Los hosts externos de imágenes están prohibidos (impuesto por las pruebas de integridad de datos y por `img-src 'self'` en la CSP).

## Estrategia de imágenes

- **Formato:** WebP (Baseline ampliamente disponible), calidad 82 para capturas de proyectos, 85 para la foto de perfil. Sin cargas PNG/JPEG en el bundle, salvo el JPEG de vista previa social (los crawlers sociales rechazan WebP) y los iconos.
- **Modelo de imágenes de proyecto:** `Project.images` es una lista ordenada de objetos `ProjectImage` (`base`, `fullWidth`, `altEn`, `altEs`); el primero es la portada de la tarjeta. Nunca reintroduzcas arrays paralelos de URLs. Las URLs de variantes se derivan de `base` únicamente mediante `projectImageUrl(image, variant)` y las fuentes de portada únicamente mediante `projectCoverSources(project)` (`entities/project/model/projectImages.ts`); no construyas rutas `-800`/`-full`/`-thumb` a mano.
- **Portadas y contenido de galería:** la tarjeta muestra su portada a `PROJECT_COVER_RATIO` (16:9) y recorta cualquier otra proporción, por lo que cada portada se compone exactamente a esa relación: una captura real del producto recortada a su contenido, o extendida con filas del propio fondo liso de la captura cuando es demasiado baja. Nunca reescales hacia arriba ni incluyas el marco del navegador en una captura. Las diapositivas de la galería muestran el producto o su funcionalidad; no añadas diapositivas que contengan solo un logotipo, tampoco como portada. `data.test.ts` comprueba la proporción de portada de las tres variantes.
- **Tres variantes por imagen de proyecto**, compartiendo todas `base`:
  - `<base>-thumb.webp` — 160 px de ancho, tira de miniaturas de la galería
  - `<base>-800.webp` — 800 px de ancho, portada de tarjeta
  - `<base>-full.webp` — tamaño original, galería a pantalla completa; también candidata de alta densidad del `srcset` de portada cuando `fullWidth` > 800 (nunca ofrezcas un descriptor `w` mayor que el fichero)
- **Textos alternativos:** cada imagen de proyecto lleva `altEn`/`altEs` describiendo qué muestra la captura (≤ 250 caracteres, EN y ES distintos, estrictamente paralelos en significado). Escríbelos mirando la imagen; la galería muestra el `alt` bajo la imagen como pie de foto, y la portada usa el `alt` de la primera imagen.
- **Vista previa social:** `public/og-cover-typographic.jpg` (JPEG 1200×630, calidad 85): la marca GONZALO.DEV, nombre, rol y stack principal en Inter sobre el degradado hero del tema oscuro, sin foto, al menos a 64 px de cada borde, con nombre y rol dentro del cuadrado central de 630×630 para vistas previas que recortan en cuadrado. Se renderiza desde una página HTML en Edge headless. `index.html` la referencia desde `og:image` y `twitter:image` mediante una ruta relativa a la raíz; el build convierte ambas en absolutas (`SITE_URL`) y rechaza cualquier otra forma. `og:image:alt` y `twitter:image:alt` llevan el mismo texto y describen qué muestra la imagen. Las plataformas sociales cachean las vistas previas por URL, así que una imagen modificada recibe un nombre de fichero nuevo.
- **Iconos:** `frontend/public/icons/` contiene el monograma GONZALO.DEV (una "G" blanca y un punto `90caf9` sobre el degradado hero): `gonzalo-dev.svg` (preferido), `gonzalo-dev.ico` (16, 32 y 48 px; enlazado con `sizes="32x32"` para que los navegadores sigan eligiendo el SVG) y `gonzalo-dev-180.png` (icono `apple-touch` opaco a sangre completa). El icono es propio del portafolio; nunca reutilices el icono de otro producto. `frontend/tooling/hosting/vercelConfig.test.ts` comprueba que cada icono e imagen social enlazados en `frontend/index.html` existan en `frontend/public/`.
- **Fallbacks:** `frontend/public/images/no-image.svg` (proyecto), `frontend/public/profile-fallback.webp` (perfil). Ambos locales; `ImageWithFallback` elige uno según su prop obligatoria `type`.
- **Estados de imagen en la galería:** `ProjectGallery` gestiona los estados de carga, cargada y error de la imagen actual, indexados por fuente e intento explícito de reintento. Usa los eventos de imagen del navegador y comprueba tanto `complete` como las dimensiones naturales para imágenes en caché. Los estados pendiente/error mantienen disponibles el cierre y la navegación entre imágenes, deshabilitan el zoom y anuncian su estado; el reintento remonta únicamente la imagen seleccionada, nunca se ejecuta automáticamente y preserva el foco del teclado. Son estados locales del recurso de imagen, no estado asíncrono de datos de proyectos ni un cliente HTTP.
- **Sin desplazamiento de diseño (CLS):** `ImageWithFallback` exige `aspectRatio` (portadas de proyecto `PROJECT_COVER_RATIO`, foto de perfil `2/3`) para que el contenedor reserve espacio mientras carga la imagen.
- **Carga diferida:** `loading="lazy"` únicamente en imágenes bajo el pliegue (below the fold). La imagen LCP de una ruta que muestra una sobre el pliegue se renderiza con `loading="eager"` + `fetchpriority="high"` y es precargada por el shell de la ruta con exactamente las mismas fuentes mediante `RouteSpec.lcpImage` (`frontend/tooling/agent-files/routes.ts`, verificado en `frontend/tooling/agent-files/shell.test.ts`): la primera portada de proyecto en `/projects` (`ProjectCard` `priority`) y la foto de perfil en `/about`. Las tarjetas destacadas de Inicio y la foto de perfil de Inicio quedan bajo el hero y permanecen diferidas (`lazy`). Nunca combines `fetchpriority` con `loading="lazy"`.
- Al añadir o reemplazar imágenes: genera las tres variantes WebP con ffmpeg + libwebp a q82 (`scale='min(160,iw)':-2`, `scale='min(800,iw)':-2` y tamaño completo; los comandos exactos están en `OPERATIONS.md` → *Add images*), registra `fullWidth` y ambos textos alternativos en `data.json`, y ejecuta `pnpm --dir frontend test` (las pruebas de integridad comprueban que cada variante exista en disco con el ancho que implica `fullWidth`). **Nunca reescales hacia arriba:** cuando el original tiene 800 px de ancho o menos, la variante `-800` tiene el tamaño de la `-full` (misma regla para `-thumb` por debajo de 160 px); `min(…, iw)` lo garantiza. No documentes ni ejecutes herramientas de imagen con `npx`: ffmpeg no descarga nada.
- **Inmutabilidad de caché:** Vercel sirve `/assets/*`, `/images/*` e `/icons/*` como inmutables durante 1 año (`frontend/vercel.json`). Vite añade hash a los nombres de ficheros JS/CSS, por lo que se renuevan en cada build; los nombres de imágenes no. Al reemplazar el contenido de una imagen, **renombra el fichero**: conserva el prefijo numérico (es la posición en la galería), cambia la parte descriptiva y renombra juntas las variantes `-thumb`, `-800` y `-full` para que mantengan un único nombre base; después actualiza `base` en `data.json`. Un icono modificado recibe igualmente nombres de fichero nuevos en `frontend/public/icons/` y enlaces nuevos en `frontend/index.html`. `frontend/index.html` se mantiene con `max-age=0, must-revalidate` para que los despliegues se recojan de inmediato.

## Enlaces y tarjetas de proyectos

- `Project.links` es una lista ordenada de `ProjectLink` (`{ kind, url }`); nunca vuelvas a añadir campos por enlace como `githubUrl`/`liveUrl` en `Project`.
- `PROJECT_LINK_KINDS` (`frontend/src/entities/project/model/projectLinks.ts`) es el registro único de tipos de enlace: cada entrada guarda su clave de etiqueta i18n y su énfasis (`primary` = botón relleno, `secondary` = botón de texto). El icono vive en `LINK_ICONS` (`ProjectCard.tsx`), porque los iconos son UI.
- Añadir un tipo = una entrada en el registro + su etiqueta `projects.links.<kind>` en `frontend/src/shared/config/i18n.ts` (EN y ES) + su etiqueta gemela en `frontend/tooling/agent-files/labels.ts` (`links.<kind>`) + su icono. La lógica de tarjetas, copias markdown y llms.txt nunca ramifica según el tipo. `frontend/tooling/agent-files/labels.test.ts` impone la paridad de etiquetas; los tipos `Record<ProjectLinkKind, …>` imponen el icono y la etiqueta gemela.
- Las copias markdown listan cada enlace con las etiquetas del registro en el orden de los datos; llms.txt enlaza el título al primer enlace primario y añade los demás.
- Las pruebas de datos de proyectos exigen tipos registrados, URLs `https` y ausencia de URLs repetidas dentro de un mismo proyecto.
- Las tarjetas muestran el primer párrafo de la descripción (`splitDescription`) y revelan el resto con un botón *Read more* / *Leer más* (`aria-expanded`, `aria-controls`); la parte plegada sigue siendo localizable por búsqueda en página con `hidden="until-found"` (`useFindableDisclosure`). Nunca pongas una caja con scroll de altura fija dentro de una tarjeta.
- Los botones de acción de la tarjeta y el botón de leer más llevan `aria-describedby` apuntando al título de la tarjeta, para que las etiquetas repetidas ("Visit Site") conserven su contexto en tecnologías de asistencia.
- El título de la tarjeta es un `h3` bajo un encabezado de sección (Inicio) y un `h2` cuando las tarjetas van directamente bajo el `h1` de la página (`/projects` pasa `titleComponent="h2"`).

## Enrutado

- **Librería**: React Router DOM (versión en `frontend/package.json`)
- **Lista única de rutas**: `APP_ROUTES` (`frontend/src/shared/config/routes.ts`, `{ id, path }` en orden de menú). El router (`frontend/src/app/routing/AppRouter.tsx`), ambos menús de navegación y los shells de ruta en tiempo de build (`frontend/tooling/agent-files/routes.ts`, cuyo `SHELLS` es un `Record<RouteId, …>`) derivan de ella. Añadir una página = una entrada en `APP_ROUTES` + su etiqueta `nav.<id>` + su cargador y esqueleto en `AppRouter` + su shell; TypeScript señala cualquier pieza faltante.
- **Patrón**: `React.lazy()` para todos los componentes de página (code-splitting); cada cargador de página se declara una sola vez en `PAGE_LOADERS` y lo reutiliza la precarga en reposo (idle prefetch). Una precarga fallida emite un aviso estructurado `page-prefetch-failed` con su ruta y error, dejando utilizable la página actual; un fallo real de carga al navegar sigue llegando al error boundary. Los slices de página exportan únicamente su componente por defecto.
- **Layouts**: todas las páginas envueltas en `PublicLayout` (Navbar + Footer + Outlet)
- **Fallback**: `<Suspense>` con esqueletos de carga específicos por página
- **Cambios de ruta**: `useRouteChangeFocus` (`frontend/src/app/layouts/lib/`) desplaza la página nueva arriba del todo y mueve el foco a `<main id="main-content">`, salvo en atrás/adelante (el navegador los restaura), cambios solo de hash (enlace de salto, volver arriba) y cambios de idioma dentro de la misma página (`/about` ↔ `/es/about`).
- **Enlaces canónicos**: `useCanonicalLinks` (`frontend/src/app/layouts/lib/`, llamado una vez en `PublicLayout`) apunta el enlace canónico, `og:url`, `og:locale` (`en_US` o `es_ES`), los alternates HTML (`hreflang="en"`, `"es"`, `"x-default"`) y ambos alternates markdown a la página e idioma actuales tras cada navegación o cambio de idioma en el cliente; solo actualiza las etiquetas que tiene el shell de ruta (el servidor de desarrollo y 404.html no las tienen).
- Rutas: inicio (/), `/about`, `/skills`, `/experience`, `/projects`, `/contact` en inglés, y sus equivalentes bajo `/es` (`/es`, `/es/about`, `/es/skills`, `/es/experience`, `/es/projects`, `/es/contact`) en español (`localizedPath` y `pathnameLanguage` en `frontend/src/shared/config/routes.ts`). Cualquier otra dirección es un 404 real: Vercel sirve 404.html (estado 404, `noindex`), cuya aplicación envía al visitante al inicio mediante el catch-all del router (`*` → inicio (/), `/es/*` → `/es`). Nunca añadas un rewrite catch-all a `frontend/vercel.json`: respondería a assets e imágenes inexistentes con la página de inicio y estado 200.

## Gestión de estado

- **Sin estado global de servidor** y **sin Zustand**. El contenido se lee de forma síncrona mediante los getters de las entidades.
- **React Context** se usa únicamente para estado transversal de UI:
  - **Tema** (`frontend/src/features/theme-switch/`): `ColorMode` = `light | dark | glass` (`COLOR_MODES` en `frontend/src/shared/config/theme.ts`). Hasta que el visitante elige uno, el tema sigue al sistema operativo (`prefers-color-scheme`, en vivo); solo una elección explícita (`setColorMode`) se guarda en `localStorage: themeMode`. `ThemeProvider` de MUI envuelve la aplicación con el único `CssBaseline` (`enableColorScheme`, para que las barras de desplazamiento y controles de formulario sigan el tema).
  - **Idioma** (`frontend/src/features/language-switch/`): `Language` = `en | es` (`SUPPORTED_LANGUAGES` en `frontend/src/shared/config/language.ts`). Solo una elección explícita (`setLanguage`) o un enlace `?lang=` se guarda en `localStorage: language`; el proveedor sincroniza el idioma activo con el prefijo de ruta (raíz ↔ `/es`) y elimina después el parámetro `lang` de la dirección. `changeLanguage` de i18next y `<html lang>` siguen al contexto.
  - **Notificaciones** (`frontend/src/features/notifications/`): MUI Snackbar + Alert para respuesta de formularios. La firma del notificador es `ShowNotification`, con su `NotificationSeverity` (`frontend/src/shared/lib`, libre de MUI); el proveedor pasa la severidad al Alert tal cual.
- **Almacenamiento**: nunca toques `localStorage` directamente. Usa `readStorage`/`writeStorage` (`frontend/src/shared/lib/storage.ts`): los navegadores que bloquean datos de sitios lanzan excepción en cualquier acceso, y una preferencia nunca debe dejar la página en blanco. Valida lo que leas (solo modos e idiomas conocidos).

## Patrón de lectura de contenido

Las páginas leen el contenido de forma síncrona mediante el hook `useContent` (`frontend/src/shared/lib/useContent.ts`):

```tsx
import { useContent } from '@/shared/lib';

const { data: projects } = useContent(() => getAllProjects());
```

### Contrato

- `data: T` — siempre definido (el contenido forma parte del bundle)
- Sin `loading`, sin `error`, sin `refetch`: no hay nada que pedir por red, cachear ni reintentar

Este contrato concierne a los datos de entidades empaquetados. Los esqueletos de módulos de ruta y los estados de recursos de imagen de la galería pertenecen a sus consumidores de UI existentes y no cambian `useContent`.

## i18n

- **Idiomas**: inglés (`en`), español (`es`)
- **Detección y rutas por idioma** (`resolveInitialLanguage`, antes del primer render): `?lang=es|en` → prefijo `/es` en la ruta (`pathnameLanguage`) → elección guardada → `navigator.language` → fallback `en`; cualquier valor distinto de `en`/`es` (tras quitar la región) se ignora. Las rutas en inglés viven en la raíz (inicio (/), `/about`, …) y las rutas en español bajo `/es` (`/es`, `/es/about`, …), sincronizadas en la barra de direcciones al cambiar el idioma o detectar español para que compartir la URL actual preserve el idioma; `?lang=es|en` sigue admitiéndose como override explícito y se limpia hacia la ruta canónica del idioma elegido. Cada ruta e idioma tiene su propio shell HTML estático con metadatos SEO localizados (`seo.en.*` y `seo.es.*`), `canonical`, `og:url`, `og:locale` (`en_US` o `es_ES`) y alternates HTML simétricos (`hreflang="en"`, `"es"`, `"x-default"`).
- **Menú de idioma**: las opciones son endónimos (`English`, `Español`) con su atributo `lang`, nunca nombres traducidos.
- **Fechas y números**: usa `formatMonthYear`/`formatPeriod`/`formatPercent` (`frontend/src/shared/lib/localeFormat.ts`) tanto en la UI como en las copias markdown. Las fechas de contenido son ISO `YYYY-MM-DD`, formateadas en UTC como mes corto y año (`Mar 2025 – Jun 2025`, `mar 2025 – Actualidad`); los porcentajes en español llevan espacio de no separación (`80 %`).
- **Ficheros de traducción**: en línea en `frontend/src/shared/config/i18n.ts`. Solo cadenas de UI; el texto de contenido vive en los datos JSON (campos En/Es).
- Mantén `frontend/src/shared/config/i18n.ts` podado: toda clave debe ser alcanzable desde el código mediante `t()`/`i18n.t()`; elimina las claves sin uso al tocar componentes.
- Los campos de contenido bilingüe (En/Es) se resuelven con `getLocalizedText(language, en, es)` de `@/shared/lib`. No reimplementes el fallback En/Es en línea.
- El contenido nunca se duplica en `frontend/src/shared/config/i18n.ts`: las páginas renderizan el texto de perfil/proyecto/experiencia directamente desde el JSON, sin fallback `|| t(...)`. En su lugar, los ficheros `data.test.ts` de las entidades exigen ambos lados de cada par En/Es renderizado.
- Las llamadas a `t()` nunca pasan texto por defecto en línea: usa `t('key')` o `t('key', { vars })`. `frontend/src/shared/config/i18n.test.ts` falla cuando los conjuntos de claves de inglés y español difieren o falta una clave estática usada en `frontend/src/` en cualquiera de los dos idiomas.
- El texto en español apunta a España (`es_ES`) y usa mayúscula inicial de frase (sentence case) en encabezados, botones y títulos (solo la primera palabra y los nombres propios en mayúscula); los encabezados de UI en inglés usan Title Case. Mantén EN y ES estrictamente paralelos en significado.
- Los arrays `technologies` (proyectos, experiencia) se muestran sin traducir en ambos idiomas, por lo que contienen únicamente nombres de tecnologías, nunca frases, con su grafía oficial (`TypeScript`, `Spring Boot`, `Tailwind CSS`, Node.js). Un chip de localización se escribe `i18n (<códigos de idioma>)`, p. ej. `i18n (EN/ES)`.
- Los valores de contenido que son claves en un solo idioma (`category` de skill) se traducen mediante i18n (`skills.categories.<Category>`) y tienen reflejo en las etiquetas de las copias markdown (`frontend/tooling/agent-files/labels.ts`); `frontend/tooling/agent-files/labels.test.ts` falla si a alguna categoría de `SKILL_CATEGORY_ORDER` le falta cualquiera de las dos.
- La insignia *Open to work* / *Disponible para trabajar* es UI, no datos: `StatusBadge` con `common.openToWork` en el hero de Inicio y en la página de Experiencia, reflejada en el idioma correspondiente en esas dos copias markdown (`openToWorkLine`, `TWIN_LABELS.openToWork`). Su color verde de éxito y su superficie opaca se mantienen consistentes en `light`, `dark` y `glass`. Mostrarla u ocultarla cambia esos tres sitios y `frontend/tooling/agent-files/twins.test.ts` a la vez.

## Skills

- `SKILL_CATEGORY_ORDER` (`frontend/src/entities/skill/model/categories.ts`) es la lista cerrada de categorías y su orden de visualización (stacks de desarrollo primero). `getSkillGroups()` agrupa las skills en ese orden para la página de Skills y su copia markdown; la prueba de datos de skills rechaza categorías desconocidas.
- Las competencias principales (página About y su copia markdown) provienen únicamente de `getCoreSkills()`: las skills de Frontend, Backend, Database, Mobile y Desktop con `level` ≥ `CORE_SKILL_LEVEL` (70). Nunca filtres por nivel en ningún otro sitio.

## Temas (Theming)

- **Tres modos**: `light`, `dark`, `glass` (estética Liquid Glass)
- **Modo glass**: base oscura de MUI con un fondo ambiental estático de degradados radiales fijos en el viewport, superficies translúcidas, colores neón y sombras de texto. El desenfoque de fondo (`backdrop-filter`) se reserva para paneles y superficies (`MuiCard`, `MuiPaper`, `MuiAppBar`), sin aplicarse en chips ni botones individuales. La barra de navegación usa el `MuiAppBar` translúcido oscuro del tema con texto claro. Los botones `contained` usan un tinte neón y borde turquesa, los botones `outlined` un tinte glass y los botones `text` permanecen transparentes para conservar la jerarquía de botones.
- **Colores de chips**: la decoración glass se aplica solo a chips de color por defecto; los colores semánticos como `success` y `error` mantienen la paleta de MUI. Los chips informativos no tienen animación en hover que sugiera una acción.
- **Movimiento decorativo**: el punto de disponibilidad pulsa de forma continua, la tarjeta de perfil de Inicio flota suavemente y sobre el borde superior tanto de esa tarjeta como del panel del formulario de Contacto camina y programa el duende pixelado compartido (`PixelGoblin` + `goblinScene` en `widgets/pixel-goblin`, emergiendo de un portal pixel 2D lateral izquierdo que se cierra tras su paso y saliendo por otro derecho al terminar, alineado en la fila 18/20 con `translateY(10%)` y `px: 4` para respetar el radio de esquina). El menú de tema tiene un `menuitemcheckbox` independiente para pausar todos ellos, guardado como `localStorage: animationsPaused` mediante los helpers de almacenamiento. `ThemeProvider` expone `--decorative-animation-state` con `GlobalStyles`; los consumidores CSS usan `animation-play-state: var(--decorative-animation-state, paused)` sin importar la feature en la UI compartida, y `PixelGoblin` conmuta del ciclo SMIL (`animated`) a su pose estática central programando con el portátil abierto y los portales cerrados (`resting`) cuando `animationsPaused` está activo o el sistema pide `prefers-reduced-motion: reduce`. Activa los efectos solo bajo `prefers-reduced-motion: no-preference` y desactívalos al imprimir. La preferencia del sistema tiene prioridad y el menú explica cuándo desactiva el movimiento. Mantén fijo el texto de la insignia; sin animación continua del fondo ni temporizadores de JavaScript.
- **Factoría de tema**: `createAppTheme(mode)` en `frontend/src/shared/config/theme.ts`
- **Constantes glass**: `glassColors`, `glassEffects` en `frontend/src/shared/config/glassStyles.ts`
- **Primer pintado (first paint)**: un script en línea en `frontend/index.html` aplica `background.default`, `color-scheme` y `theme-color` del modo guardado o del sistema antes de que cargue el JavaScript (sin destello blanco en `dark` y `glass`); `ThemeProvider` retira esos estilos en línea al montar y `CssBaseline` pasa a controlar los colores de la página a partir de ahí. El script replica `ThemeProvider` y `createAppTheme`: `ThemeProvider.test.tsx` lo ejecuta para cada modo, y la CSP lo permite por hash (véase Seguridad).
- **Carga inicial**: `frontend/index.html` muestra únicamente la marca del portafolio y un `progress` nativo indeterminado dentro de la única raíz de la app, con CSS en línea acotado. Su nombre accesible sigue al idioma inicial del documento (`Loading portfolio` en inglés y `Cargando portafolio` en los shells en español); ningún texto visible necesita traducción antes de que cargue i18next. El indicador usa el esquema de color del prepintado y rotación continua en CSS, estática con movimiento reducido. El primer render de React lo reemplaza de inmediato; los esqueletos `Suspense` específicos de cada ruta gestionan después los módulos de página pendientes. `noscript` oculta el cargador y preserva el fallback generado sin JS. Esto no añade resolutor de idioma, temporizador de arranque, script extra ni retardo artificial; proporciona respuesta visual de arranque, no recuperación ante fallos del bundle.
- **Colores neón**: turquesa `5DE0E6`, violeta `8A6EFF`, rosa `FF7B9C`
- **Contraste**: el texto cumple 4.5:1 y los contornos 3:1 en los tres modos. El texto situado sobre un degradado recibe una superficie sólida (*Download CV* en el hero, `StatusBadge`); el inicio del degradado del hero se elige por modo (`HERO_GRADIENT_START`); los inputs con contorno usan el borde reforzado de `MuiOutlinedInput` del tema.

## Accesibilidad

- Los encabezados siguen el esquema del documento: un `h1` por página y después `h2`/`h3` sin saltos. Define `component` siempre que la variante de MUI emitiera un nivel incorrecto (`subtitle1`/`subtitle2` renderizan `h6`, `h5` renderiza `h5`); el texto plano como nombres de skills y empresas usa `component="p"`.
- Los enlaces de escritorio y la lista del cajón lateral van cada uno dentro de un `<nav aria-label>`; la página actual lleva `aria-current="page"` (además de subrayado o `selected`, nunca solo color). El botón de menú expone `aria-expanded`/`aria-controls` y el cajón tiene nombre accesible.
- Los selectores de idioma y de tema son botones de menú (`aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, menú etiquetado por su botón, elementos `menuitemradio` + `aria-checked`). Por debajo de `sm` muestran solo el icono, de modo que su `aria-label` es el nombre e incluye el texto visible (`Language: English (EN)`, `Theme: Dark`).
- La cabecera fija nunca tapa el foco (`scroll-padding-top` en `frontend/src/app/styles/index.css`). El enlace para volver arriba aparece al desplazarse (`.visible`) y es siempre alcanzable por teclado.
- Los formularios validan en el idioma del sitio (`noValidate` + `helperText` traducido, foco en el primer campo inválido), declaran `autoComplete` para datos personales y marcan el botón de envío ocupado con `aria-disabled` (nunca `disabled`, que pierde el foco). Mientras se envía, los campos son `readOnly` para conservar el foco y evitar que la respuesta borre ediciones nuevas; vuelven a ser editables al completarse o fallar.
- La impresión ("Guardar como PDF") renderiza texto negro sobre fondo blanco sin la cabecera en todos los temas (`@media print` en `frontend/src/app/styles/index.css`).

## Pruebas

- **Framework**: Vitest + @testing-library/react (versiones en `frontend/package.json`)
- **Entorno**: jsdom
- **Mocks**: `vi.mock` a nivel de módulo, `vi.fn()` para espías
- **Convenciones**: pruebas junto a lo que prueban (`docs/ARCHITECTURE.md`), bloques `describe`/`it`, mocks antes de las importaciones
- **MUI real**: MUI renderiza en jsdom, por lo que no hay mock global de MUI; las pruebas de componentes renderizan los proveedores reales que necesitan (`MemoryRouter`, `LanguageProvider`, `ThemeProvider`) y consultan por rol y nombre accesible. Las aserciones usan APIs DOM estándar (`getAttribute`, `textContent`); `jest-dom` no es una dependencia. jsdom no implementa `matchMedia` ni `scrollTo`: hazles stub por prueba (`vi.stubGlobal`, `vi.spyOn`).
- **Pruebas de integridad de contenido**: `frontend/src/entities/<entity>/api/data.test.ts` validan el JSON estático (contrato, orden y existencia de imágenes vía `import.meta.glob`).
- **Ejecución**: `pnpm --dir frontend test`
- **Se ejecutan todas las pruebas y se prueban las reglas de arquitectura**: véase `docs/ARCHITECTURE.md`.
- **Puertas locales**: `.githooks/commit-msg` comprueba el mensaje de commit y `.githooks/pre-push` ejecuta `python verify.py` con las 9 puertas del repositorio y del frontend antes de publicar.

## Build y despliegue

- **Build**: `tsc -b && vite build`. `frontend/tsconfig.json` es un fichero solución: `tsc -b` comprueba los tipos de `frontend/tsconfig.app.json` (`frontend/src` y `frontend/tooling`, librerías de navegador) y `frontend/tsconfig.node.json` (los ficheros de configuración en `frontend/` listados en su `include`, librerías de Node).
- **Chunks** (`build.rolldownOptions.output.codeSplitting`): `react-vendor` (`react`, `react-dom`, `scheduler`, `react-router`, `react-router-dom`) y `mui-vendor` (únicamente los módulos `@mui/*` y `@emotion/*` del primer render, `tags: ['$initial']`); los componentes de MUI usados por una sola página (Timeline, TextField, Dialog) permanecen en el chunk de esa página. No vuelvas a `manualChunks`: Rolldown lo depreca y arrastraba React dentro de `mui-vendor`.
- **Disposición lado a lado de TypeScript**: `typescript` es un alias a `@typescript/typescript6` — la API programática que consume `typescript-eslint`, exponiendo `tsc6` — mientras que `@typescript/native` proporciona el compilador nativo al que resuelve `tsc` (y por tanto `pnpm --dir frontend build`). No los colapses en una única dependencia `typescript` hasta que `typescript-eslint` soporte la API del compilador nativo.
- **Dev**: servidor de desarrollo de Vite en `localhost:5173` (`pnpm --dir frontend dev --host` para abrirlo desde un teléfono en la LAN); no necesita proxy de API. Sirve los ficheros para agentes pero no los shells de ruta: comprueba los metadatos de los shells con `pnpm --dir frontend build && pnpm --dir frontend preview` en la dirección con barra final (`/about`).
- **Prod**: Vercel (directorio raíz `frontend/`) sin rewrites: cada ruta es un fichero propio y cualquier otra dirección recibe 404.html; sin proxy `/api`. La verificación corre en local mediante `.githooks/pre-push`; no hay workflows de GitHub Actions.
- **Saltos de línea**: `.gitattributes` mantiene LF en todo checkout (`* text=auto eol=lf`); el hash CSP del script en línea depende de ello.

## Salida legible por agentes

- `frontend/tooling/agent-files/` genera llms.txt, robots.txt, sitemap.xml (con las URLs en inglés y en español), una copia markdown en inglés y otra en español por ruta, un shell HTML en inglés (`frontend/dist/<ruta>/index.html`) y otro en español (`frontend/dist/es/<ruta>/index.html`) por ruta, incluida la página de inicio (con su propio `<html lang>`, `title`, `description`, `og:*`, `og:locale`, `canonical`, alternates HTML con `hreflang="en"`/`"es"`/`"x-default"`, alternates markdown con `hreflang="en"`/`"es"`, JSON-LD y un fallback `<noscript>` en el idioma del shell que enlaza las copias markdown), y 404.html (`noindex`, sin `canonical`).
- Cada shell se construye a partir del `frontend/index.html` compilado (`buildRouteShell`): el título, la descripción y los textos Open Graph en inglés y en español provienen de `frontend/tooling/agent-files/routes.ts` (`meta.en` y `meta.es`), de modo que los valores en `frontend/index.html` solo sirven al servidor de desarrollo. No reintroduzcas `<meta name="title">` ni `og:locale:alternate`.
- Los shells contienen metadatos, UI temporal de arranque dentro de la raíz de la app y el texto `<noscript>`, no contenido de página prerenderizado: los lectores sin JavaScript obtienen el contenido a través de las copias markdown; nunca afirmes lo contrario.
- Se ejecuta como plugin de Vite (`frontend/tooling/agent-files/vitePlugin.ts`, conectado en `frontend/vite.config.ts`): `pnpm --dir frontend build` emite todo en `frontend/dist/`; `pnpm --dir frontend dev` sirve llms.txt, robots.txt, sitemap.xml y las copias markdown desde middleware, mientras que los shells y 404.html existen solo en la salida del build. **Nada generado se commitea en git.**
- El contenido proviene de los getters de las entidades y de `frontend/src/shared/lib/richText.ts`; los metadatos de los shells replican `seo.*` en `frontend/src/shared/config/i18n.ts` y las etiquetas de las copias markdown replican las cadenas de UI. Las pruebas imponen ambas paridades, la integridad de enlaces entre los ficheros generados, la salida determinista, el ancho y alto reales declarados para la imagen social y que el plugin de Vite esté conectado en `frontend/vite.config.ts` tanto para el build de producción como para el middleware del servidor de desarrollo.
- La dirección del sitio es `SITE_URL`/`absoluteUrl` (`frontend/src/shared/config/site.ts`) y los nombres de fichero de las copias markdown provienen de `markdownTwinPath` (`frontend/src/shared/config/routes.ts`), compartidos por el build y `useCanonicalLinks`. Los shells de ruta viven en `frontend/tooling/agent-files/routes.ts`; `ROUTES` se deriva de `APP_ROUTES`, de modo que a una página nueva no puede faltarle su shell (el registro `SHELLS` está indexado por `RouteId`).
- `frontend/src/shared/lib/richText.ts` es el conjunto único de reglas compartido por `RichTextRenderer` y las copias markdown: `normalizeRichText` para saltos de línea y `parseBulletLine` para líneas de viñeta (`●•◦▪` en cualquier posición, `-`/`*` solo al inicio de línea). Modifícalo únicamente en beneficio de ambos consumidores.
- Las copias markdown formatean fechas, porcentajes, grupos de skills y competencias principales con los mismos helpers que las páginas (`frontend/src/shared/lib/localeFormat.ts`, `getSkillGroups`, `getCoreSkills`), de modo que página y copia markdown nunca discrepan.
- Cada copia markdown termina con `## Pages` (enlaces al resto de copias markdown en su idioma) y nunca salta un nivel de encabezado: las entradas de proyectos y experiencia son `##` en sus páginas, y los proyectos destacados son `###` bajo `## Featured Projects` en Inicio.
- Los datos estructurados son un único `@graph` en cada shell: `WebSite` (`/#website`) y `Person` (`/#person`, con `knowsAbout` = `getCoreSkills()`, `knowsLanguage` a partir de los idiomas hablados y `homeLocation`). Deriva cada valor de los datos; nunca lo escribas a mano.
- Las copias markdown se sirven con `X-Robots-Tag: noindex` (`frontend/vercel.json`): los agentes las leen y los buscadores indexan las páginas HTML. sitemap.xml no lleva `<lastmod>` a propósito: los builds se ejecutan en clones superficiales (shallow clones), donde las fechas de git son erróneas, y una fecha errónea es peor que ninguna.
- `frontend/tooling/font-preload/` (solo en build) añade `<link rel="preload" as="font" crossorigin>` para el fichero latin de Inter en `frontend/index.html` antes de copiar los shells, de modo que todas las páginas lo heredan; el build falla si falta el fichero.

## Seguridad

- **Scripts**: el script de build de esbuild está aprobado en el repositorio mediante `allowBuilds: { esbuild: true }` en `frontend/pnpm-workspace.yaml`, el único ajuste de aprobación de builds que lee pnpm 11+; el script de instalación de cualquier otra dependencia permanece bloqueado. Nunca añadas un paquete ahí sin revisar sus scripts de instalación. No interviene ninguna variable de entorno (`PNPM_APPROVE_BUILDS` no es un ajuste de pnpm).
- **Formulario de contacto**: EmailJS en el navegador (las claves son públicas por diseño); no se almacenan secretos en el repositorio. La llamada de red vive en `features/contact-form/api/contactApi.ts`: el SDK se importa al enviar (toca `localStorage` al cargar, lo que lanza excepción cuando los datos de sitios están bloqueados) y envía con `blockHeadless` y un `limitRate` de 10 s. Un único plazo límite (deadline) de 15 s medido con reloj monotónico cubre tanto la carga del SDK como el envío; al expirar lanza `ContactTimeoutError`, y una carga tardía del SDK no puede iniciar un envío. Un envío ya en curso aún puede llegar, por lo que se avisa al visitante de que no reenvíe. Los campos se recortan (`trim`) y validan antes de enviar (`model/validation.ts`); el estado del formulario, la guarda de vuelo único (single-flight) y las notificaciones viven en `features/contact-form/model/useContactForm.ts`. Todo mensaje de fallo ofrece el correo del propietario.
- **Content-Security-Policy** (`frontend/vercel.json`, en cada respuesta): `default-src 'self'`; `script-src 'self'` más el `sha256` del script de prepintado en `frontend/index.html`; `style-src 'self' 'unsafe-inline'` (Emotion inyecta estilos); `img-src 'self'` y `font-src 'self'` (sin URLs `data:`, sin hosts externos); `connect-src 'self' https://api.emailjs.com`; `object-src 'none'`; `base-uri`/`form-action 'self'`; `frame-ancestors 'none'`. Los bloques JSON-LD son datos, no scripts, y no necesitan hash. Editar ese script en línea cambia su hash: `frontend/tooling/hosting/vercelConfig.test.ts` falla e imprime el valor que hay que poner en la política. Añade un host únicamente cuando el sitio compilado lo necesite.
- No existe superficie de autenticación en esta aplicación.

## Organización de ficheros (FSD)

Las capas, slices, importaciones y su aplicación viven en `docs/ARCHITECTURE.md` y `ARCHITECTURE.md` → *Feature-Sliced Design Rules*, incluidas las dos decisiones deliberadas de este repositorio.

## Skills compañeras

- `react-fsd-maintainer`: procedimientos para crear un slice, bajar código de capa y corregir un hallazgo de arquitectura del lint; las reglas en sí están en `docs/ARCHITECTURE.md` y `ARCHITECTURE.md`.
