---
title: Revisión transversal y acabado de «Mesa de Taller»
date: 2026-11-26
phase: F3
---
**Objetivo y dueño:** producto; parte 4 de `F3` (`F3.4`). El dueño encargó revisar de
punta a punta el rediseño que dejó otro agente sin commitear y dejarlo terminado:
«tu trabajo consiste en dejar final y correcto todo, todo bien arreglado sin
inconsistencias e incoherencias», con permiso para contrastar textos con
`my-personal-projects`, GitHub y LinkedIn, y después «en general cada cosa que se
diga en toda la web para asegurar que sea correcta». Lo externo solo se reporta.
Decisiones: `#visual-redesign-workbench-two-themes` (reescrita sin la tipografía),
`#workbench-type-is-self-hosted-inter-with-technical-features` (provisional, nueva)
y `#typing-does-not-check-indexed-access-or-type-aware-lint` (abierta, nueva).

**Qué cambió.**

- **Textos contrastados con la fuente.** Los 38 ejemplos aplicados de habilidades se
  reescribieron con lo que muestran los repositorios y la experiencia (el Docker de
  Globatecnic es una red Docker compartida; la CSP estricta es la de este
  portafolio). En proyectos: el error boundary del Kanban envuelve la aplicación y
  no una ruta; las comprobaciones de arquitectura del portafolio son reglas AST
  propias y un plugin de Vite; etiquetas de especificaciones en español más
  precisas («Verificación», «Estado y copias», «Dominio clínico», «Superficie para
  agentes») y sus detalles redactados como frases; «Professional Portfolio».
  License Generator enlaza su ficha de Microsoft Store (tipo de enlace nuevo
  `microsoftStore`).
- **Interfaz.** Los encabezados y llamadas en inglés siguen el Title Case de la
  skill del proyecto; el botón de animaciones en inglés dice «Play» y no «Resume»,
  que se leía como currículum; el alt de la tarjeta social sale en el idioma de
  cada shell (`SOCIAL_IMAGE_ALT` en `frontend/tooling/agent-files/shell.ts`).
- **Contenido nuevo.** Inicio muestra cuatro áreas de trabajo (`focusAreas` del
  perfil) en la página y en su copia markdown; el saludo del perfil, sin uso, sale.
  Sobre mí agrupa las competencias por categoría (`getCoreSkillGroups`).
- **Datos tipados en su borde.** Los JSON ya no se convierten con aserciones: el
  tipo de proyecto, el tipo de enlace y la categoría de habilidad se estrechan con
  `toProjectType`, `toProjectLinkKind` y `toSkillCategory`, que fallan con el valor
  desconocido; perfil, experiencia e idiomas se asignan a su tipo sin conversión.
- **Carga.** Cada página tiene su esqueleto con su misma composición
  (`frontend/src/shared/ui/SkeletonLoaders.tsx`); el cargador genérico sale.
- **Accesibilidad y movimiento.** El botón de animaciones es un botón de acción sin
  `aria-pressed`, con nombre que contiene su texto visible, y explica la pausa del
  sistema solo cuando la hay (`usePrefersReducedMotion`, compartido con el duende).
- **Impresión.** Sin filtros, conmutadores, «Leer más» ni contadores de capturas, y
  con el texto completo de cada tarjeta.
- **Ajustes.** La marca de cabecera pasa a dos líneas a `320 px` con letra a `24 px`;
  Habilidades se reparte en columnas sin huecos; sin estilos en línea en la tarjeta
  ni en Contacto; colores de la consola y puntos del 404 con la paleta nueva. Salen
  sin consumidores NARROW_FOR_ITS_TEXT (lo usaba el `sx` de MUI; el CSS usa
  `19.99em`), TranslateIcon y WorkIcon.
- **Capturas.** Las cuatro del propio portafolio se rehicieron sobre la interfaz
  final (`1440×810`, oscuro, inglés), con sus tres variantes WebP.
- **Documentos.** `DESIGN.md`, `OPERATIONS.md` y `docs/es/OPERATIONS.md`,
  `ARCHITECTURE.md` y `docs/es/ARCHITECTURE.md`, la skill
  `portfolio-conventions`, `#how-far-the-interface-follows-the-reader-font-size` y
  `docs/ROADMAP.md`.

**Cómo se verificó.**

- **Al arrancar**, sobre el árbol del otro agente (sin commit, base `9f4ef52`):
  `./dev verify` con las 9 puertas en verde y 439 tests.
- **Defectos reintroducidos.** Con `value in PROJECT_LINK_KINDS` en el estrechado
  del tipo de enlace, el test que pasa `'toString'` se puso en rojo; se deshizo. El
  test del alt social por idioma se vio en rojo (492 tests, 1 fallido: la shell
  española recibía el alt inglés) antes de escribir `SOCIAL_IMAGE_ALT`.
- **Al terminar:** `./dev verify` con las 9 puertas en verde, 492 tests (53 más que al
  arrancar) y el tablero sin hallazgos, en dos corridas seguidas sin cambios.
- **En navegador** (Chrome por CDP sobre el servidor de desarrollo): 13 rutas a
  `320 px` con letra a `24 px`, en claro y en oscuro, sin desbordamiento; las 7 páginas en claro a `1440 px`
  sin desbordamiento; el esqueleto de cada página retenido con su módulo sin llegar,
  en oscuro a `1440 px` y a `390 px`; 16 paradas de tabulador en Inicio, todas con
  foco visible; galería abierta, flecha, zoom al 150 % y `Escape` con el foco de
  vuelta en la portada; `/projects` a `/en/projects` al cambiar de idioma; `glass`
  guardado cae al claro del sistema y sigue guardado; el cajón cierra con `Escape`
  y devuelve el foco al botón de menú; con movimiento reducido el botón dice
  «Animations paused» y su motivo; impresión sin cabecera ni controles, con 309 px
  de texto antes plegado en la primera tarjeta. Consola y red sin errores.
- **Build:** `llms.txt`, copias markdown y shells con el contenido nuevo; la tarjeta
  social mide `1200×630` y su fuente `frontend/tooling/og-cover/og-cover.html`
  renderizada coincide con el JPEG publicado (PSNR de luminancia 46 dB).
- **Tipado más estricto, medido sin activarlo:** noUncheckedIndexedAccess da 69
  errores (28 en código, 41 en tests) y exactOptionalPropertyTypes 3; queda abierto.

**Segunda revisión, independiente, de cada texto contra su proyecto.** Otra sesión
retomó la parte antes de que el dueño la viera y, a petición suya, comprobó de
nuevo cada ficha de proyecto en los dos idiomas (descripción, tecnologías,
especificaciones de arquitectura, textos alternativos con la imagen abierta y
enlaces) contra el código de su repositorio: unas 300 afirmaciones, ninguna
inventada y estas correcciones.

- **Quotidia.** Los recordatorios con alarma son de tareas y eventos, no solo de
  eventos; «sin cuenta» lleva en español el matiz «principal» que ya tenía el
  inglés, porque la sincronización opcional pide cuenta de Google; el control del
  diario elige un mes, no una fecha.
- **License Generator.** El botón de la captura de aplicaciones copia la clave
  pública del producto, no «su ID».
- **NutriManager.** Harris-Benedict calcula las necesidades energéticas en la ficha
  del paciente; las calorías y macronutrientes de una dieta son sumas de sus
  ingredientes. La licencia se vincula al equipo (identificador de máquina del
  sistema operativo). La ofuscación se enuncia como el paso de Obfuscar que el
  proyecto configura. El dueño confirmó que se cuente que inició el proyecto y que
  hoy lo continúa y mantiene Daniel Martínez.
- **Gonzalo Apps.** No toda aplicación tiene galería de capturas; el generador no
  garantiza una revisión antes de cada commit, sino que lo publicado es lo
  versionado y verificado; la habilidad DNS nombra el DNS de Cloudflare y no
  Cloudflare Pages.
- **Pokédex y Kanban.** La separación container/presentational se acota a donde
  existe; «Estado y copias» dice lo mismo en los dos idiomas.
- **Idiomas.** El catalán pasa de «Intermedio» a «Comprensión C1, expresión
  básica», que es lo que dice el CV y lo que el dueño confirmó.
- **Capturas rehechas** sobre los sitios publicados (`1440 px`, oscuro), con nombre
  nuevo por la caché inmutable: la portada de Pokédex, que aún mostraba tres
  filtros retirados, y las tres de Gonzalo Apps que listaban una sola aplicación.
  La de arquitectura del portafolio se rehízo con el texto corregido.
- **Restos.** Salen tres claves de traducción sin uso (viewAll de proyectos y
  languageButton y themeButton de common); los comentarios del lint dejan
  de presentar MUI como el kit del sitio; `docs/ARCHITECTURE.md` y `AGENTS.md`
  nombran `frontend/vitest.config.ts`, que es donde están las guardas de Vitest
  (el error venía de antes del rediseño), y la regla de `fetch` se describe sin
  una excepción que no existe; la skill `portfolio-conventions` describe la
  precarga, el botón «Leer más» y el selector de idioma como son.
- **Verificación:** `./dev verify` con las 9 puertas en verde y 492 tests después de
  estos cambios.

**Revisión previa al commit.** El dueño condicionó el commit a revisar que el
cambio es una mejora real, sin errores nuevos y con la calidad, la arquitectura y
el sistema de diseño cuidados.

- **Código leído:** tema y proveedor, cabecera y cajón, galería, tarjeta de
  proyecto, enrutador, límite de errores, avisos, formulario, imagen con respaldo,
  Inicio, Sobre mí, Proyectos y pie. Siguen las capas y los índices de cada slice;
  no hay conversiones de tipo forzadas ni HTML inyectado; cada escucha tiene su
  limpieza; el doble envío del formulario sigue cubierto por su guarda.
- **Dos defectos corregidos, cada uno con su test visto en rojo.** El orden de los
  filtros de plataforma era una lista que dejaba fuera sin aviso un tipo de
  proyecto nuevo: ahora es un Record por tipo, que el compilador exige completo, y
  los filtros salen de los tipos que tiene el catálogo; con el rango de móvil
  cambiado, el test del orden falló. La paleta oscura está dos veces en
  `frontend/src/app/styles/tokens.css` (por elección y por preferencia del sistema)
  y nada cruzaba las copias, ni el fondo con `THEME_BACKGROUNDS`:
  `frontend/src/app/styles/tokens.test.ts` las cruza, y con un valor cambiado en
  una copia falló (496 tests, 2 fallidos); los dos defectos se deshicieron.
- **Medido contra la versión publicada:** el JavaScript de la primera carga baja de
  593 kB a 363 kB sin comprimir al salir el paquete de MUI (232 kB), y la
  instalación tiene 59 paquetes menos.
- **Visto contra la versión publicada:** la portada anterior era un degradado con
  el nombre y tres etiquetas; la nueva enseña desde el primer pantallazo qué
  construye, las cuatro áreas de trabajo, la foto y el primer proyecto, y cada
  tarjeta alterna capturas y arquitectura.
- **Versión:** `frontend/package.json` pasa de la 1.1.1 a la 2.0.0, que es la que
  enseña el pie; un rediseño completo de la interfaz es un cambio mayor.
- **Sin tocar, a juicio:** la galería y la superposición de las portadas usan
  colores fijos porque van sobre imágenes y son oscuras en los dos temas; el
  texto enriquecido conserva los nombres de variante body1 y body2 heredados.

**Pendiente.**

- La revisión visual final del dueño, que confirma o cambia la tipografía
  (`#workbench-type-is-self-hosted-inter-with-technical-features`), para cerrar `F3`.
- Si el tipado se endurece (`#typing-does-not-check-indexed-access-or-type-aware-lint`).
- Las cuatro capturas de NutriManager son anteriores a la reorganización de la
  ficha de paciente; rehacerlas pide ejecutar la aplicación con una licencia.
- Fuera del repositorio, cuando este cambio esté publicado: la descripción del
  repositorio `portfolio` en GitHub nombra MUI y lleva el tema `material-ui`; el
  README del perfil de GitHub y el proyecto «Portafolio profesional» de LinkedIn
  aún describen el diseño anterior; subir la tarjeta social nueva como *Social
  preview* y refrescar la vista previa en LinkedIn.
