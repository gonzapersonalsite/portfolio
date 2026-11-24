---
title: Las abiertas de la interfaz cerradas antes del rediseño, con el foco visible en cada control y la letra del lector en toda la interfaz
date: 2026-11-24
phase: none
---
**Objetivo y dueño:** producto; encargo del dueño para cerrar lo que la guía de
diseño dejó abierto en `#2026-11-24-design-guide-and-current-operations-docs`,
con el mínimo cambio de aspecto, porque más adelante pedirá un rediseño visual
estudiado con él. Palabras del dueño en el encargo: «aborda primero esas cosas
que me comentas que has dejado en cada proyecto», «No quiero deuda de ningun
tipo» y «Dejo a tu preferencia recomendados»; y al revisar el cierre: «todo
entra confirmado no dejes nada provisional» y «Tu decides por el bien de cada
proyecto». No abre ni cierra ninguna fase ni tramo. Lo empezó un agente que se
quedó sin cuota antes de registrarlo, lo siguió otro que midió el resultado en
el navegador, y lo cerró un tercero, que arregló lo que esa medida encontró.

**Qué cambió.**

- **El foco se ve en todo control.** Material UI quita el contorno de todo lo
  que construye sobre su botón base y marca el foco con una onda translúcida:
  medido antes del cambio, los enlaces del menú, los selectores y los botones
  cambiaban 0 píxeles a 3:1 (contraste máximo 1,54 a 1,88). El tema devuelve el
  contorno del navegador, por dentro en las opciones de un menú
  (`frontend/src/shared/config/theme.ts`). El campo de la terminal del 404
  deja de quitárselo y la opción «Animaciones» deshabilitada conserva opacidad
  completa (`#focus-indicator-of-the-terminal-input-and-the-disabled-animations-item`).
- **La portada de un proyecto dibuja su anillo sobre la capa que la
  oscurece.** El contorno blanco del botón quedaba debajo de esa capa, que el
  navegador pinta encima por estar posicionada, y salía gris: sobre la captura
  casi blanca de Quotidia no cambiaba ni un píxel a 3:1 (máximo 2,81 en claro,
  2,99 en oscuro y 3,15 en Liquid Glass). Ahora es la capa la que lleva el
  contorno blanco y, dentro, una banda casi negra de 2 píxeles
  (`frontend/src/entities/project/ui/ProjectCard.tsx`,
  `#a-focused-project-cover-draws-its-ring-on-its-overlay`). Un primer intento,
  la banda sola sobre la capa, tapó el anillo en las demás portadas y bajó su
  medida de unos 3500 píxeles a 3:1 a unos 450; se descartó antes de
  registrarlo.
- **Toda la interfaz sigue la letra del lector.** El tema cuenta los puntos de
  ruptura en `rem` y lleva a `rem` los iconos de los botones y de las
  etiquetas, el alto de las etiquetas y el de la barra; en una ventana
  estrecha para su letra (`NARROW_FOR_ITS_TEXT`) las etiquetas, la marca de la
  cabecera y una palabra más ancha que la página se parten
  (`theme.ts`, `frontend/src/widgets/navbar/ui/Navbar.tsx`), y el espacio que
  el desplazamiento reserva bajo la cabecera pasa a `rem`
  (`frontend/src/app/styles/index.css`). Solo el texto dibujado del duende
  escala con su dibujo (`#how-far-the-interface-follows-the-reader-font-size`).
- **El lint rechaza un tamaño de letra fijo** en `src`: un número o un valor
  en píxeles en un `fontSize` de un estilo, de un objeto por punto de ruptura
  o de un atributo, salvo los glifos del dibujo del duende
  (`frontend/eslint.config.js`).
- **El servidor de desarrollo deja de vigilar el almacén de pnpm** que queda
  dentro del proyecto en el contenedor: vigilar sus decenas de miles de
  ficheros por el montaje hacía esperar cada lectura, y la ruta que no existe
  acababa en la pantalla de error con un 504 de Vite
  (`frontend/vite.config.ts`, `#eslint-forbids-fixed-font-sizes-and-vite-ignores-pnpm-store`).
- **Para quién** pasa de lectura del agente a decisión confirmada
  (`#the-site-is-for-whoever-evaluates-its-owner-as-a-developer`).
- **Los documentos de operación pasan a vivos.** `ARCHITECTURE.md`,
  `OPERATIONS.md` y las tres copias de `docs/es/` estaban declarados
  `closed` aunque el `README.md` los enlaza como guías; ahora el tablero
  comprueba sus citas y sus enlaces (`tools/board/documents.txt`). Las
  direcciones del sitio que no son rutas del repositorio (`llms.txt`, el 404,
  `/projects/`) dejan de ir entre comillas invertidas, que el tablero lee como
  rutas.
- **`DESIGN.md`** sube lo cerrado a «Decisiones tomadas», deja en «Lo que sigue
  abierto» solo el aspecto que espera al rediseño
  (`#choices-of-look-wait-for-the-visual-redesign`) y pone al día «Cómo
  comprobarlo».

**Cómo se verificó.**

- **Al arrancar,** sobre `24706ad` y con el árbol limpio, no se repitieron las
  puertas: rige el verde con que ese commit pasó su pre-push,
  `RESULT: 9 puertas, 0 en rojo` con 410 tests de la aplicación.
- **Cada test se vio fallar** con el defecto repuesto: los once del tema
  devolviendo los puntos de ruptura en píxeles, los iconos y las etiquetas sin
  `rem`, la barra en píxeles y el botón base sin contorno (`expected 'px' to be
  'rem'`, `expected [ '18px', '18px' ] to deeply equal [ '27px', '27px' ]`,
  `expected [ '32px', '24px' ] to deeply equal [ '48px', '36px' ]`); el de la
  terminal (`expected [ 'none', '0', '0px' ] to not include 'none'`); el de
  «Animaciones» (`expected '0.38' to be '1'`); el del servidor de desarrollo
  quitando el almacén de lo que ignora; y el de la portada devolviendo el
  anillo al botón (`expected [ '', '0' ] to deeply equal [ '3px solid white',
  '-3px' ]`). Los casos del lint se escriben como código que la regla rechaza
  y código que acepta.
- **En Chrome 157 sobre el build:** 84 visitas (14 páginas por 3 temas, a 1280
  y a 390 píxeles, 35 344 elementos) sin eventos de consola ni peticiones
  fallidas salvo los 12 estados 404 a propósito de la dirección que no existe;
  a la letra por defecto, la caja y el estilo calculado de cada elemento son
  los de antes en 72 de las 84 visitas, y en las 12 restantes (390 píxeles,
  Inicio y Proyectos) la página mide lo mismo; a 320 píxeles con la letra a 24
  y a 640 por 400 con escala 2, ninguna de las 14 páginas se desplaza de lado
  ni corta un texto en los tres temas. Foco: el campo de la terminal cambia
  1633 píxeles a 3:1 con un perímetro de 780 (contraste máximo 16,41 a 16,58)
  en los tres temas y los dos idiomas; «Animaciones», con menos movimiento
  pedido, 1052 con un perímetro de 546 (19,03 en claro, 10,11 en oscuro y 14,86
  en Liquid Glass); las siete portadas, al menos 2140 con un perímetro de
  1133, en los tres temas y en las dos lenguas, y con el contraste forzado en
  claro y en oscuro, al menos 1735. El enlace de salto aparece arriba al
  recibir el foco: la sonda lo lee fuera de la pantalla porque mide antes de
  que acabe su deslizamiento de 0,3 s. Además: el cajón del móvil se abre por
  toque a 390 por 844, el árbol de accesibilidad de Inicio da 262 nodos,
  impresa la página es negro sobre blanco sin cabecera, y con el contraste
  forzado no hay errores.
- **En Firefox 160,** por WebDriver BiDi: las 14 páginas en los tres temas, 42
  visitas, sin desplazarse de lado, sin errores de JavaScript y con su título
  en su idioma.
- **En el servidor de desarrollo,** con `.\dev.cmd start --port 5477`, la
  dirección que no existe cargó tres veces seguidas sus 159 peticiones sin un
  504.
- **Al terminar:** `.\dev.cmd verify`, `RESULT: 9 puertas, 0 en rojo`, con 443
  tests de la aplicación, repetida hasta que el veredicto no cambió.

**Pendiente.**

- El aspecto que espera al rediseño visual, aplazado por el dueño:
  `#choices-of-look-wait-for-the-visual-redesign`.
- **No se comprobó** Safari ni Edge, un lector de pantalla, un dispositivo
  táctil real, ni el envío del formulario de contacto, que escribe a un
  servicio externo.
