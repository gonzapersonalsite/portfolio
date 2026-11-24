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
  La raíz no fija tamaño ([index.css](frontend/src/app/styles/index.css)), la
  tipografía del tema va en `rem` ([theme.ts](frontend/src/shared/config/theme.ts))
  y los iconos que el producto dimensiona junto a un texto también: el punto
  del distintivo de estado, las viñetas, la marca de galería, los iconos de
  «Sobre mí» y el de la pantalla de error
  ([StatusBadge.tsx](frontend/src/shared/ui/StatusBadge.tsx),
  [RichTextRenderer.tsx](frontend/src/shared/ui/RichTextRenderer.tsx),
  [ProjectCard.tsx](frontend/src/entities/project/ui/ProjectCard.tsx),
  [AboutPage.tsx](frontend/src/pages/about/ui/AboutPage.tsx),
  [ErrorBoundary.tsx](frontend/src/shared/ui/ErrorBoundary.tsx)). El tema
  lleva lo mismo a lo que dimensiona Material UI: los iconos de los botones y
  de las etiquetas, el alto de las etiquetas y de la barra, y los puntos de
  ruptura, que cuentan en `rem`; y una ventana estrecha para su letra deja
  partir las etiquetas y la marca de la cabecera. Quien agranda la letra del
  navegador tiene que verla agrandada aquí, sin que un icono se quede atrás.
  Solo el texto dibujado dentro del duende escala con su dibujo, como imagen
  (`#how-far-the-interface-follows-the-reader-font-size`), y el lint rechaza
  un tamaño de letra fijo
  (`#eslint-forbids-fixed-font-sizes-and-vite-ignores-pnpm-store`).
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
  el del navegador: el tema lo devuelve a todo lo que Material UI construye
  sobre su botón base, que lo quitaba y marcaba el foco con una onda por
  debajo de 3:1, y lo dibuja por dentro en las opciones de un menú
  ([theme.ts](frontend/src/shared/config/theme.ts)). Lo conservan también el
  campo de la terminal del 404 y la opción «Animaciones», que sigue alcanzable
  y legible cuando el sistema pide menos movimiento
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
  Sin esto, quien navega sin ratón pierde dónde está.
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
  móvil estrecho, un zoom alto o los dos con la letra a 24 píxeles no obligan
  a desplazarse de lado: en una ventana estrecha para su letra, una palabra
  más ancha que la página se parte ([theme.ts](frontend/src/shared/config/theme.ts)).
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

Solo el aspecto, aplazado hasta que el dueño abra el rediseño visual que
anunció, estudiado con él:

- **El porqué del aspecto (`#choices-of-look-wait-for-the-visual-redesign`).**
  La paleta de cada tema, la fuente Inter, los radios y el estilo Liquid Glass
  están hechos y a la vista, pero ningún registro dice por qué son esos ni qué
  habría que conservar al cambiarlos. Esta guía no lo inventa.

Cuando se abra el rediseño o se añada una regla visual, se registra en
[docs/registry/decisions/](docs/registry/decisions/) y pasa arriba con su cita.

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
| La regla que rechaza un tamaño de letra fijo | [frontend/eslint.config.js](frontend/eslint.config.js) |

Una medida que acompaña a un texto va en `rem` o en `em`, no como número: es
la primera decisión de arriba, y un número en el `fontSize` de un `sx` son
píxeles fijos, que el lint rechaza.

## Cómo comprobarlo

`./dev verify` (en Windows, `.\dev.cmd verify`) corre los tests que hay al lado
de cada componente: comprueban nombres, papeles, el foco al cambiar de página,
el tema que rige, que cada icono corregido y lo que dimensiona el tema crecen
con una letra de 24 píxeles en la raíz, qué contorno de foco queda en cada
control corregido y que el lint rechaza un tamaño de letra fijo; no el
aspecto. Lo demás se mira en un navegador, sobre el build servido con
`./dev build` y `./dev start --preview` y la dirección que imprime:

- **Páginas.** Inicio, Sobre mí, Habilidades, Experiencia, Proyectos, Contacto
  y una dirección que no existe, en español y bajo `/en`, en los tres temas.
  La consola queda limpia y ninguna petición falla.
- **Tamaños.** A 320 píxeles CSS de ancho, con la letra del navegador a 24
  píxeles y con el zoom al 200 %, no aparece desplazamiento horizontal y nada
  se corta; con la letra a 24, el texto y sus iconos crecen.
- **Teclado.** Sin ratón: el tabulador recorre cada página, el cajón del
  móvil, los menús de idioma y de tema y la galería de un proyecto, y el foco
  se ve en cada parada, también sobre la portada de un proyecto.
- **Esquemas.** En claro y en oscuro, cambiando el del sistema o emulándolo,
  todo texto se lee; con el contraste forzado del sistema, el foco se sigue
  viendo.

El 2026-11-24, tras cerrar las abiertas, se hizo este recorrido en Chrome 157
sobre el build, emulando ancho, esquema, tamaño de letra, preferencia de
movimiento, contraste forzado, impresión y un teléfono táctil:

- 84 visitas (14 páginas por 3 temas, a 1280 y a 390 píxeles) sin un evento de
  consola ni una petición fallida, salvo el 404 a propósito de la dirección
  que no existe. A la letra por defecto, la caja y el estilo calculado de cada
  elemento son los de antes en 72 visitas, y en las otras 12 la página mide lo
  mismo.
- A 320 píxeles con la letra a 24, y a 640 por 400 con escala 2 como zoom al
  200 %, ninguna de las 14 páginas se desplaza de lado ni corta un texto, en
  los tres temas.
- El contraste mínimo medido del texto sobre fondo liso es 4,64 en claro, 5,31
  en oscuro y 6,75 en Liquid Glass; en este último, el texto que cae sobre el
  degradado no lo juzga la sonda y se miró a ojo.
- El foco del campo de la terminal, de la opción «Animaciones» deshabilitada y
  de las siete portadas de proyecto cambia a 3:1 o más al menos el perímetro
  del control, en los tres temas y en los dos idiomas; las portadas también
  con el contraste forzado. El enlace de salto aparece arriba al recibir el
  foco.
- El cajón del móvil se abre por toque a 390 por 844; el árbol de
  accesibilidad de Inicio da 262 nodos con nombre y papel; impresa, la página
  es negro sobre blanco y sin cabecera; con el contraste forzado no hay
  errores.
- En Firefox 160, las 14 páginas en los tres temas cargan sin errores de
  JavaScript, sin desplazarse de lado y con su título en su idioma.

No se comprobó: Safari ni Edge; un lector de pantalla; un dispositivo táctil
real; ni el envío del formulario de contacto, que escribe a un servicio
externo. Hazlo antes de dar por buena una pantalla nueva.
