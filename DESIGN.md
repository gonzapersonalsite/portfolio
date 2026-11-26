# Diseño de la interfaz

Esta guía dice para quién se diseña la interfaz, qué decisiones visuales ha
tomado el producto, dónde están hechas y cómo se comprueba que siguen en pie.
Los valores (colores, fuentes, medidas) viven en el tema y en los estilos: aquí
van la intención y el porqué. Es del producto: se reescribe cuando el producto
decide otra cosa, y ninguna actualización de la plantilla la toca.

## Para quién

El sitio lo abre quien evalúa a Gonzalo Martínez como desarrollador: alguien de
selección o de un equipo técnico que llega desde un enlace, en el móvil o en el
escritorio, en español o en inglés, y que en una visita corta tiene que poder
ver quién es, qué ha construido y cómo escribirle. A veces la página acaba
impresa o guardada como PDF para un proceso de selección. Las decisiones de
abajo se juzgan contra esa frase.

Sale de lo que el producto dice de sí mismo ([README](README.md), el
contenido del perfil y el bloque de impresión de
[index.css](frontend/src/app/styles/index.css)), y el dueño la confirmó por
delegación (`#the-site-is-for-whoever-evaluates-its-owner-as-a-developer`).

## Decisiones tomadas

Cada una cabe en unas líneas: qué se decidió, por qué y dónde se ve. Dicen lo
que el código ya hace. Una decisión visual nueva se registra como cualquier
otra, con su porqué largo, y aquí queda la línea que la enuncia con su cita.

- **El texto y lo que lo acompaña siguen el tamaño de letra de cada persona.**
  La raíz no fija tamaño ([index.css](frontend/src/app/styles/index.css)), las
  hojas de estilos y variables usan `rem` y `em`
  ([tokens.css](frontend/src/app/styles/tokens.css)) y los iconos SVG propios que
  el producto dimensiona junto a un texto también escalan en `em`: el punto del
  distintivo de estado, las viñetas, los iconos de tarjeta/galería, «Sobre mí»
  y la pantalla de error
  ([Icons.tsx](frontend/src/shared/ui/Icons.tsx),
  [StatusBadge.tsx](frontend/src/shared/ui/StatusBadge.tsx),
  [RichTextRenderer.tsx](frontend/src/shared/ui/RichTextRenderer.tsx),
  [ProjectCard.tsx](frontend/src/entities/project/ui/ProjectCard.tsx),
  [AboutPage.tsx](frontend/src/pages/about/ui/AboutPage.tsx),
  [ErrorBoundary.tsx](frontend/src/shared/ui/ErrorBoundary.tsx)). Los puntos
  de ruptura cuentan en `rem` / `em`, y bajo `19.99em`
  la cabecera, las etiquetas y el titular de Inicio ajustan su tamaño para no
  romper palabras ni desbordar a `320 px` con letra a `24 px`. Solo el texto
  dibujado dentro del duende escala con su dibujo, como imagen
  (`#how-far-the-interface-follows-the-reader-font-size`), y el lint rechaza
  un tamaño de letra fijo
  (`#eslint-forbids-fixed-font-sizes-and-vite-ignores-pnpm-store`).
- **Dos temas en «Mesa de Taller», y manda el sistema hasta que la persona
  elige.** Solo existen claro y oscuro
  ([tokens.css](frontend/src/app/styles/tokens.css),
  [theme.ts](frontend/src/shared/config/theme.ts),
  `#visual-redesign-workbench-two-themes`); sin elección guardada el sitio
  sigue al sistema, también cuando cambia a mitad de visita, y solo una
  elección explícita se guarda
  ([ThemeProvider.tsx](frontend/src/features/theme-switch/ui/ThemeProvider.tsx)).
  Un valor legado como `glass` en `themeMode` cae pasivamente al sistema sin
  sobrescribirse. El fondo y el esquema de color se pintan antes de que cargue
  la aplicación ([index.html](frontend/index.html)), para que quien usa oscuro
  no reciba un destello blanco, y los controles nativos siguen el tema.
- **La marca, el duende y los idiomas ya tienen su registro.** El nombre
  visible y su acento (`#visible-brand-is-the-owner-name`,
  `#brand-accent-marks-the-surname`), el icono «Mesa de Taller»
  (`#icon-keeps-the-g-monogram-dot`), el rol público
  (`#public-role-is-full-stack-developer`) y la tarjeta social
  (`#github-social-preview-is-a-tolerated-copy`); el duende pixelado
  (`#hero-card-hosts-the-profile-pixel-goblin`,
  `#hero-goblin-scene-and-resting-pose`,
  `#pixel-goblin-portals-and-contact-panel`); y las rutas por idioma
  (`#localized-spanish-routes-and-shells`).
- **Tipografía técnica autoalojada sobre `@fontsource-variable/inter` fijada,
  confirmada por el dueño.** El sitio mantiene Inter Variable
  autoalojada en su versión fijada, activando las variantes estilísticas
  técnicas (`cv02`, `cv03`, `cv04`, `cv11`), ajuste óptico y cifras tabulares
  en marcas de tiempo, etiquetas y chips
  ([index.css](frontend/src/app/styles/index.css)), junto con la pila
  monoespaciada del sistema ([tokens.css](frontend/src/app/styles/tokens.css),
  `#workbench-type-is-self-hosted-inter-with-technical-features`).
- **El movimiento decorativo se puede parar, y quien pide menos movimiento al
  sistema no tiene que pedirlo otra vez.** Los controles directos de barra y
  cajón móvil incluyen un botón independiente para pausar las animaciones que
  no informan de nada, el duende incluido, y la preferencia del sistema las
  deja en pausa sin tocar nada
  ([ThemeProvider.tsx](frontend/src/features/theme-switch/ui/ThemeProvider.tsx),
  [ThemeSelector.tsx](frontend/src/features/theme-switch/ui/ThemeSelector.tsx),
  [PixelGoblin.tsx](frontend/src/widgets/pixel-goblin/ui/PixelGoblin.tsx));
  con esa preferencia, además, ninguna transición dura lo bastante para verse
  ([index.css](frontend/src/app/styles/index.css)).
- **El foco del teclado se ve, y la cabecera fija no lo tapa.** El contorno es
  el del navegador con `--accent` en `:focus-visible`
  ([index.css](frontend/src/app/styles/index.css)). Lo conservan el campo de
  la terminal del 404 y el botón «Animaciones», que sigue alcanzable por teclado
  con `aria-disabled` y borde discontinuo cuando el sistema pide menos
  movimiento
  (`#focus-indicator-of-the-terminal-input-and-the-disabled-animations-item`),
  y la portada de un proyecto lo dibuja sobre la capa que la oscurece, blanco
  con una banda oscura dentro, para verse sobre cualquier captura
  (`#a-focused-project-cover-draws-its-ring-on-its-overlay`). El
  desplazamiento reserva el alto de la cabecera
  ([index.css](frontend/src/app/styles/index.css)); el primer tabulador ofrece
  saltar al contenido, y al cambiar de página el foco pasa a la región
  principal, que no dibuja contorno porque es una región y no un control
  ([PublicLayout.tsx](frontend/src/app/layouts/ui/PublicLayout.tsx),
  [useRouteChangeFocus.ts](frontend/src/app/layouts/lib/useRouteChangeFocus.ts)).
  Al cerrar el cajón móvil o la galería (`<dialog>` nativos), el foco vuelve al
  control que los abrió. Sin esto, quien navega sin ratón pierde dónde está.
- **Nada se dice solo con un color.** La página actual del menú lleva subrayado
  además de su estado ([Navbar.tsx](frontend/src/widgets/navbar/ui/Navbar.tsx)),
  el distintivo de disponibilidad es un texto
  ([StatusBadge.tsx](frontend/src/shared/ui/StatusBadge.tsx)), el proyecto
  destacado lleva nombre además de la estrella
  ([ProjectCard.tsx](frontend/src/entities/project/ui/ProjectCard.tsx)) y un
  error de formulario es una frase.
- **El formulario habla en el idioma de la página.** Cada campo lleva su
  etiqueta visible, los errores los escribe la aplicación y no el navegador,
  que los pondría en su propio idioma, y el botón no suelta el foco mientras se
  envía ([ContactForm.tsx](frontend/src/features/contact-form/ui/ContactForm.tsx)).
- **Un texto se lee sobre cualquier fondo.** Lo que cae encima de una imagen o
  de una captura lleva su propia superficie opaca
  ([StatusBadge.tsx](frontend/src/shared/ui/StatusBadge.tsx),
  [ProjectCard.tsx](frontend/src/entities/project/ui/ProjectCard.tsx)), y los
  campos de formulario usan bordes de contraste explícito sobre `--surface-sub`
  ([tokens.css](frontend/src/app/styles/tokens.css),
  [ContactForm.css](frontend/src/features/contact-form/ui/ContactForm.css)).
- **El contenido no ensancha la página.** El mínimo que se atiende son 320
  píxeles CSS ([index.css](frontend/src/app/styles/index.css)): la marca y los
  controles de cabecera simplifican el espacio móvil sin solaparse, y la marca
  pasa a dos líneas antes que meterse bajo los botones
  ([Navbar.css](frontend/src/widgets/navbar/ui/Navbar.css)) y una cadena sin
  espacios, como el correo o lo que se escribe en la terminal del 404, se parte
  dentro de su caja ([ContactPage.css](frontend/src/pages/contact/ui/ContactPage.css),
  [NotFoundPage.css](frontend/src/pages/not-found/ui/NotFoundPage.css)). Un
  móvil estrecho, un zoom alto o los dos con la letra a 24 píxeles no obligan
  a desplazarse de lado: en una ventana estrecha para su letra, una palabra
  más ancha que la página se parte ([index.css](frontend/src/app/styles/index.css)).
- **Una imagen reserva su hueco antes de llegar.** Toda imagen de contenido
  declara su proporción y tiene un sustituto si falla
  ([ImageWithFallback.tsx](frontend/src/shared/ui/ImageWithFallback.tsx)), así
  el texto no salta mientras carga.
- **Los identificadores que unen un control con su texto salen de `useId()`.**
  Dos tarjetas o dos menús en la misma página no comparten ninguno
  ([ProjectCard.tsx](frontend/src/entities/project/ui/ProjectCard.tsx),
  [ThemeSelector.tsx](frontend/src/features/theme-switch/ui/ThemeSelector.tsx)).
  Los fijos son anclas que existen una vez por página: el contenido principal y
  la navegación del móvil
  ([PublicLayout.tsx](frontend/src/app/layouts/ui/PublicLayout.tsx),
  [Navbar.tsx](frontend/src/widgets/navbar/ui/Navbar.tsx)).
- **Impresa, la página es negro sobre blanco, sin cabecera ni controles.** Sea
  cual sea el tema, porque imprimir o guardar como PDF es una de las formas en
  que esta página llega a quien selecciona
  ([index.css](frontend/src/app/styles/index.css)). En papel no hay «Leer más»:
  se imprime el texto entero de cada tarjeta, y los filtros, los conmutadores
  `Vista`/`Arquitectura` y los contadores de capturas no salen
  ([ProjectCard.tsx](frontend/src/entities/project/ui/ProjectCard.tsx)).

## Lo que sigue abierto

La dirección «Mesa de Taller», la identidad de iconos y vista previa social, las
variantes tipográficas sobre `Inter Variable` y la retirada definitiva de
`@mui/*` y `@emotion/*` en código, manifiesto y lockfile ya están aplicadas. El
dueño dio por buena la revisión visual y confirmó la tipografía, que eligió el
agente por delegación (`#workbench-type-is-self-hosted-inter-with-technical-features`), y la fase `F3` está cerrada.

## Dónde está hecho

| Qué | Dónde |
|---|---|
| Variables de color, tipografía y estado de animación en claro y oscuro | [frontend/src/app/styles/tokens.css](frontend/src/app/styles/tokens.css) |
| Modos admitidos (`light` / `dark`) y respaldo pasivo de `glass` | [frontend/src/shared/config/theme.ts](frontend/src/shared/config/theme.ts) |
| Estilos globales: raíz, retícula, primitivas `.wb-*`, salto, volver arriba e impresión | [frontend/src/app/styles/index.css](frontend/src/app/styles/index.css) |
| Qué tema rige, su elección guardada y la pausa de las animaciones | [frontend/src/features/theme-switch](frontend/src/features/theme-switch/index.ts) |
| El estilo de cada componente | Hojas CSS co-localizadas en su segmento `ui/`; la regla está en «Estilos» de [la arquitectura](docs/ARCHITECTURE.md) |
| La estructura de toda página: salto, cabecera, región principal y pie | [frontend/src/app/layouts/ui/PublicLayout.tsx](frontend/src/app/layouts/ui/PublicLayout.tsx) |
| Lo que se ve mientras carga la aplicación, y el primer pintado del tema | [frontend/index.html](frontend/index.html) |
| La regla que rechaza un tamaño de letra fijo | [frontend/eslint.config.js](frontend/eslint.config.js) |

Una medida que acompaña a un texto va en `rem` o en `em`, no como número o
en `px`: es la primera decisión de arriba, y el lint rechaza los valores fijos
de `fontSize` en `src/`.

## Cómo comprobarlo

`./dev verify` (en Windows, `.\dev.cmd verify`) corre los tests que hay al lado
de cada componente: comprueban nombres, papeles, el foco al cambiar de página,
el tema que rige, que cada icono y espaciado en `rem` crecen con una letra de
24 píxeles en la raíz, el contorno del foco y retorno en `<dialog>` nativos y
que el lint rechaza un tamaño de letra fijo; no el aspecto. Lo demás se mira en
un navegador, sobre el build servido con `./dev build` y `./dev start --preview`
y la dirección que imprime:

- **Páginas.** Inicio, Sobre mí, Habilidades, Experiencia, Proyectos, Contacto
  y una dirección que no existe, en español y bajo `/en`, en los dos temas
  (`light` y `dark`). La consola queda limpia y ninguna petición falla.
- **Tamaños.** A 320 píxeles CSS de ancho, con la letra del navegador a 24
  píxeles y con el zoom al 200 %, no aparece desplazamiento horizontal y nada
  se corta; con la letra a 24, el texto y sus iconos crecen. En móvil a 390 px,
  la cabecera mantiene espacio libre entre marca y botones.
- **Teclado.** Sin ratón: el tabulador recorre cada página, el cajón móvil
  (`<dialog>` con retorno del foco y cierre con `Escape`), los controles directos
  de idioma y tema/animaciones y la galería de proyectos, y el foco se ve en
  cada parada, también sobre la portada de un proyecto.
- **Esquemas e impresión.** En claro y en oscuro, cambiando el del sistema o
  emulándolo (incluido el cambio en vivo sin parpadeo de contraste), todo texto
  se lee; al imprimir, la página pasa a negro sobre blanco sin cabecera.

El 2026-11-25, tras migrar todo `frontend/src/` a «Mesa de Taller» sin MUI, se
hizo este recorrido en Chrome headless por CDP sobre el build de producción
(`http://127.0.0.1:4173`), emulando ancho, esquema, tamaño de letra, preferencia
de movimiento, impresión y perfil móvil:

- 84 visitas totales (14 rutas por 2 temas en `1280×800` y `390×844@3`, más
  `320×640` a `24 px` y `640×400` a escala `2` como zoom del 200 %) sin errores
  de consola ni peticiones fallidas (salvo el 404 esperado en la ruta
  inexistente), con `0 px` de desbordamiento horizontal y `0` solapes en la
  cabecera móvil.
- Contraste mínimo medido del texto sobre superficie sólida: `5,02:1` en claro
  (`Móvil` sobre `--surface-sub`, con el acento `--accent` ajustado a `rgb(178, 52, 7)`)
  y `5,57:1` en oscuro (`Móvil` sobre `--surface-sub`).
- Pruebas interactivas en navegador: conmutación `Oscuro → Claro` sin destello
  de contraste a `40 ms`; respaldo pasivo de `themeMode = glass` hacia claro y
  oscuro del sistema sin sobrescribir `localStorage`; botón de animaciones
  alcanzable con `aria-disabled="true"` bajo `prefers-reduced-motion: reduce` y
  `PixelGoblin` en reposo; cambio directo `ES ↔ EN` hacia ruta equivalente;
  apertura y cierre con `Escape` del `<dialog>` móvil (con etiquetas visibles en
  su pie y retorno de foco); conmutador `Vista`/`Arquitectura` y apertura/cierre
  con `Escape` en `ProjectGallery` con retorno de foco; terminal interactiva de
  404 (`cd projects` → `/projects`); y `332` nodos con nombre y papel en el árbol
  de accesibilidad de Inicio.
- Vista de impresión (`@media print`) verificada tras el último ajuste de
  estilos en la entrega de cierre de `F3.2` para confirmar fondo blanco
  uniforme en botones, chips y tarjetas.
- En `F3.3` se verificó sobre el build de producción en Chrome headless que
  los iconos `g-workbench.*`, la tarjeta `og-cover-mesa-taller-gonzalo-martinez.jpg`
  (`1200×630`), la marca de cabecera `#17181A`/`#FF7847`, `Inter Variable` con
  `cv02`/`cv03`/`cv04`/`cv11` y `tabular-nums` se sirven a `200 OK` sin errores
  de consola ni peticiones fallidas tras desinstalar MUI/Emotion.
- En `F3.4` se repitió el recorrido de teclado, galería, cajón, idioma, valor
  legado, movimiento reducido, impresión y tema claro sobre el servidor de
  desarrollo; las cifras están en su entrega
  (`#2026-11-26-workbench-cross-review-and-finish`).

No se comprobó: Firefox, Safari ni Edge; contraste forzado del sistema en esta
pasada; un lector de pantalla; un dispositivo táctil físico; ni el envío real
del formulario de contacto, que escribe a un servicio externo. Hazlo antes de
dar por cerrada la fase.
