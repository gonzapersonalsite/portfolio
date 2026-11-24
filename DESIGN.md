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

Este párrafo es la lectura que hace el agente de lo que el producto dice de sí
mismo ([README](README.md), el contenido del perfil y el bloque de impresión de
[index.css](frontend/src/app/styles/index.css)); el dueño no lo ha dictado, y
por eso figura también en «Lo que sigue abierto».

## Decisiones tomadas

Cada una cabe en unas líneas: qué se decidió, por qué y dónde se ve. Dicen lo
que el código ya hace. Una decisión visual nueva se registra como cualquier
otra, con su porqué largo, y aquí queda la línea que la enuncia con su cita.

- **El texto y lo que lo acompaña siguen el tamaño de letra de cada persona.**
  La raíz no fija tamaño ([index.css](frontend/src/app/styles/index.css)), la
  tipografía del tema va en `rem` ([theme.ts](frontend/src/shared/config/theme.ts))
  y los iconos que el producto dimensiona junto a un texto también: el punto
  del distintivo de estado, las viñetas, la marca de galería, los iconos de
  «Sobre mí» y el de la pantalla de error
  ([StatusBadge.tsx](frontend/src/shared/ui/StatusBadge.tsx),
  [RichTextRenderer.tsx](frontend/src/shared/ui/RichTextRenderer.tsx),
  [ProjectCard.tsx](frontend/src/entities/project/ui/ProjectCard.tsx),
  [AboutPage.tsx](frontend/src/pages/about/ui/AboutPage.tsx),
  [ErrorBoundary.tsx](frontend/src/shared/ui/ErrorBoundary.tsx)). Quien agranda
  la letra del navegador tiene que verla agrandada aquí, sin que un icono se
  quede atrás. Lo que todavía no la sigue está en
  `#how-far-the-interface-follows-the-reader-font-size`.
- **Tres temas, y manda el sistema hasta que la persona elige.** Claro, oscuro
  y Liquid Glass salen de un solo tema
  ([theme.ts](frontend/src/shared/config/theme.ts)); sin elección guardada el
  sitio sigue al sistema, también cuando cambia a mitad de visita, y solo una
  elección explícita se guarda
  ([ThemeProvider.tsx](frontend/src/features/theme-switch/ui/ThemeProvider.tsx)).
  El fondo y el esquema de color se pintan antes de que cargue la aplicación
  ([index.html](frontend/index.html)), para que quien usa oscuro no reciba un
  destello blanco, y los controles nativos siguen el tema.
- **La marca, el duende y los idiomas ya tienen su registro.** El nombre
  visible y su acento (`#visible-brand-is-the-owner-name`,
  `#brand-accent-marks-the-surname`), el icono
  (`#icon-keeps-the-g-monogram-dot`), el rol público
  (`#public-role-is-full-stack-developer`) y la tarjeta social
  (`#github-social-preview-is-a-tolerated-copy`); el duende pixelado
  (`#hero-card-hosts-the-profile-pixel-goblin`,
  `#hero-goblin-scene-and-resting-pose`,
  `#pixel-goblin-portals-and-contact-panel`); y las rutas por idioma
  (`#localized-spanish-routes-and-shells`).
- **El movimiento decorativo se puede parar, y quien pide menos movimiento al
  sistema no tiene que pedirlo otra vez.** El selector de tema lleva una opción
  que pausa las animaciones que no informan de nada, el duende incluido, y la
  preferencia del sistema las deja en pausa sin tocar nada
  ([ThemeProvider.tsx](frontend/src/features/theme-switch/ui/ThemeProvider.tsx),
  [ThemeSelector.tsx](frontend/src/features/theme-switch/ui/ThemeSelector.tsx),
  [PixelGoblin.tsx](frontend/src/widgets/pixel-goblin/ui/PixelGoblin.tsx));
  con esa preferencia, además, ninguna transición dura lo bastante para verse
  ([index.css](frontend/src/app/styles/index.css)).
- **El foco del teclado se ve, y la cabecera fija no lo tapa.** El contorno es
  el del navegador o el de Material UI; el desplazamiento reserva el alto de la
  cabecera ([index.css](frontend/src/app/styles/index.css)); el primer
  tabulador ofrece saltar al contenido, y al cambiar de página el foco pasa a
  la región principal, que no dibuja contorno porque es una región y no un
  control ([PublicLayout.tsx](frontend/src/app/layouts/ui/PublicLayout.tsx),
  [useRouteChangeFocus.ts](frontend/src/app/layouts/lib/useRouteChangeFocus.ts)).
  Sin esto, quien navega sin ratón pierde dónde está. Los dos controles donde
  hoy no se ve están en
  `#focus-indicator-of-the-terminal-input-and-the-disabled-animations-item`.
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
  de un degradado lleva su propia superficie opaca
  ([StatusBadge.tsx](frontend/src/shared/ui/StatusBadge.tsx),
  [ProjectCard.tsx](frontend/src/entities/project/ui/ProjectCard.tsx)), y el
  borde de los campos se oscurece respecto al de Material UI para que el campo
  se distinga del fondo ([theme.ts](frontend/src/shared/config/theme.ts)).
- **El contenido no ensancha la página.** El mínimo que se atiende son 320
  píxeles CSS ([index.css](frontend/src/app/styles/index.css)): la marca de la
  cabecera encoge con el ancho
  ([Navbar.tsx](frontend/src/widgets/navbar/ui/Navbar.tsx)) y una cadena sin
  espacios, como el correo o lo que se escribe en la terminal del 404, se parte
  dentro de su caja ([ContactPage.tsx](frontend/src/pages/contact/ui/ContactPage.tsx),
  [NotFoundPage.tsx](frontend/src/pages/not-found/ui/NotFoundPage.tsx)). Un
  móvil estrecho o un zoom alto no obligan a desplazarse de lado.
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
- **Impresa, la página es negro sobre blanco y sin cabecera.** Sea cual sea el
  tema, porque imprimir o guardar como PDF es una de las formas en que esta
  página llega a quien selecciona
  ([index.css](frontend/src/app/styles/index.css)).

## Lo que sigue abierto

Está por decidir, y lo decide el dueño con el producto delante:

- **Hasta dónde sigue la interfaz el tamaño de letra.** Los iconos que
  dimensiona Material UI dentro de un botón o de una etiqueta, el texto
  dibujado dentro del duende y las separaciones en píxeles no crecen; y a 320
  píxeles con la letra a 24 la página deja de caber. Las cifras y las opciones
  están en `#how-far-the-interface-follows-the-reader-font-size`.
- **El foco en dos controles.** El campo de la terminal del 404 solo muestra su
  cursor, y la opción «Animaciones», cuando el sistema pide menos movimiento,
  recibe el foco sin dibujar nada
  (`#focus-indicator-of-the-terminal-input-and-the-disabled-animations-item`).
- **El porqué del aspecto.** La paleta de cada tema, la fuente Inter, los
  radios y el estilo Liquid Glass están hechos y a la vista, pero ningún
  registro dice por qué son esos ni qué habría que conservar al cambiarlos.
  Esta guía no lo inventa.
- **Para quién.** El párrafo de arriba es una lectura, no una decisión
  registrada.

Cuando una de ellas se decida, pasa a la lista de arriba con su porqué.

## Dónde está hecho

| Qué | Dónde |
|---|---|
| Paleta, tipografía y estilo de cada componente de Material UI, por tema | [frontend/src/shared/config/theme.ts](frontend/src/shared/config/theme.ts) |
| Colores y efectos de Liquid Glass | [frontend/src/shared/config/glassStyles.ts](frontend/src/shared/config/glassStyles.ts) |
| Estilos globales: raíz, enlace de salto, volver arriba, menos movimiento e impresión | [frontend/src/app/styles/index.css](frontend/src/app/styles/index.css) |
| Qué tema rige, su elección guardada y la pausa de las animaciones | [frontend/src/features/theme-switch](frontend/src/features/theme-switch/index.ts) |
| El estilo de cada componente | Su `sx`, a su lado; la regla está en «Estilos» de [la arquitectura](docs/ARCHITECTURE.md) |
| La estructura de toda página: salto, cabecera, región principal y pie | [frontend/src/app/layouts/ui/PublicLayout.tsx](frontend/src/app/layouts/ui/PublicLayout.tsx) |
| Lo que se ve mientras carga la aplicación, y el primer pintado del tema | [frontend/index.html](frontend/index.html) |

Una medida que acompaña a un texto va en `rem` o en `em`, no como número: es
la primera decisión de arriba, y un número en el `fontSize` de un `sx` son
píxeles fijos.

## Cómo comprobarlo

`./dev verify` (en Windows, `.\dev.cmd verify`) corre los tests que hay al lado
de cada componente: comprueban nombres, papeles, el foco al cambiar de página,
el tema que rige y que cada icono corregido crece con una letra de 24 píxeles
en la raíz; no el aspecto. Lo demás se mira en un navegador, sobre el build
servido con `./dev build` y `./dev start --preview` y la dirección que imprime:

- **Páginas.** Inicio, Sobre mí, Habilidades, Experiencia, Proyectos, Contacto
  y una dirección que no existe, en español y bajo `/en`, en los tres temas.
  La consola queda limpia y ninguna petición falla.
- **Tamaños.** A 320 píxeles CSS de ancho no aparece desplazamiento
  horizontal. Con la letra del navegador a 24 píxeles, el texto crece. Con el
  zoom al 200 %, nada se corta.
- **Teclado.** Sin ratón: el tabulador recorre cada página, el cajón del
  móvil, los menús de idioma y de tema y la galería de un proyecto, y el foco
  se ve en cada parada.
- **Esquemas.** En claro y en oscuro, cambiando el del sistema o emulándolo,
  todo texto se lee.

El 2026-11-24 se hizo este recorrido en Chrome 157 sobre el build, emulando
ancho, esquema, tamaño de letra y preferencia de movimiento:

- 42 visitas (14 páginas por 3 temas) sin un solo evento de consola ni petición
  fallida.
- A 1280 píxeles con la letra a 24, de 1316 textos, iconos y controles crecen
  1202 una vez y media; los 114 que no son los iconos que dimensiona Material
  UI y el texto dibujado del duende, los dos de la primera abierta.
- A 320 píxeles, y a 640 por 400 con escala 2 como zoom al 200 %, ninguna de
  las 14 páginas se desplaza de lado ni corta un texto, en claro y en oscuro.
- El contraste mínimo medido del texto sobre fondo liso es 4,64 en claro, 5,31
  en oscuro y 6,75 en Liquid Glass; en este último, el texto que cae sobre el
  degradado no lo juzga la sonda y se miró a ojo.
- El tabulador da 29 paradas en Inicio, 15 en Sobre mí, 14 en Habilidades y en
  Experiencia, 40 en Proyectos, 21 en Contacto y 22 en el 404; 6 en el cajón
  del móvil, 2 en el menú de idioma, 4 en el de tema y 13 en la galería. Todas
  dibujan su foco y ninguna queda tapada o fuera de la pantalla, con las dos
  salvedades de la segunda abierta.

No se comprobó: Firefox, Safari y Edge; un lector de pantalla; un dispositivo
táctil real; el modo de contraste forzado del sistema; la página impresa; ni el
envío del formulario de contacto, que escribe a un servicio externo. Hazlo
antes de dar por buena una pantalla nueva.
