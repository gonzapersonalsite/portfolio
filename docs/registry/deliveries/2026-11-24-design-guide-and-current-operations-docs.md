---
title: Guía de diseño, documentos de operación al día y los iconos que no seguían el tamaño de letra
date: 2026-11-24
phase: none
---
**Objetivo y dueño:** producto; encargo del dueño, transmitido por el agente
principal, para dejar el repositorio sin deudas respecto a su plantilla tras
`#2026-11-24-scaffold-upgrade-to-0-8-1`: que los documentos de operación digan
el flujo de hoy (desde 0.7.0 las puertas corren en contenedores, por el
lanzador), que el producto adopte la guía `DESIGN.md` que el starter entrega
desde 0.8.0, y que se corrija lo que incumpla lo que esa guía enuncia.
Palabras del dueño en el encargo: «dejar correcto y final sin deudas y bien
implementado» y «tienes permisos de commit y push siempre». No abre ni cierra
ninguna fase ni tramo. Deja dos abiertas:
`#how-far-the-interface-follows-the-reader-font-size` y
`#focus-indicator-of-the-terminal-input-and-the-disabled-animations-item`.

**Qué cambió.**

- **Documentos de operación.** `OPERATIONS.md` y `docs/es/OPERATIONS.md`
  describían instalar y correr con el gestor de paquetes en el anfitrión, una
  lista propia de puertas y un hook que ya no es así. Ahora citan «Running
  locally» del `README.md`, el §1 del contrato y `gates.txt` en vez de repetir
  la lista, y dicen lo propio de operar: un solo punto de entrada (`./dev`),
  que `./dev prepare` no corre scripts de instalación, el servidor de
  desarrollo y la vista previa del build con sus puertos, `./dev format-fix`,
  y que los hooks llaman al lanzador. Los párrafos fechados del historial no
  se tocan.
- **Los otros documentos con el mismo desfase.** `docs/es/README.md` copiaba
  los requisitos y el arranque anteriores y queda como el original en inglés;
  `ARCHITECTURE.md` y `docs/es/ARCHITECTURE.md` nombraban tres órdenes del
  gestor de paquetes y ahora las del lanzador, y la frase en español recupera
  lo que decía la inglesa; `portfolio-conventions` deja de dar órdenes sueltas
  para las pruebas, las puertas, el build y el servidor, y corrige qué paquete
  trae el compilador (`typescript` es la serie 6 y `tsc` sale del alias
  `@typescript/native`); `react-fsd-maintainer` decía que un componente lleva
  un CSS Module, y aquí lleva su `sx`; el comentario de
  `frontend/tooling/og-cover/og-cover.html` da la orden que funciona con el
  servidor en su contenedor, y el de `frontend/vite.config.ts` dice quién
  publica el puerto.
- **La guía.** `DESIGN.md` en la raíz, con la estructura de la del starter y
  escrita para este producto: once decisiones que el código ya cumple, cada
  una con su porqué y su fichero, las de marca, duende e idiomas por cita, y
  cuatro abiertas. Se declara como viva en `tools/board/documents.txt`, con su
  fila en el §4 de `AGENTS.md` y su enlace en `README.md` y en
  `docs/es/README.md`. No se traduce: el §6 del contrato fija el español para
  la prosa y no exige copia en inglés, como ya ocurre con
  `docs/ARCHITECTURE.md`; el enlace del `README.md` lo avisa.
- **Seis medidas que no seguían el tamaño de letra del lector,** en cinco
  ficheros. Eran números o píxeles en el tamaño de un icono que acompaña a un
  texto, y pasan a `rem` con el mismo valor al tamaño por defecto: el punto de
  `frontend/src/shared/ui/StatusBadge.tsx` (12), la viñeta y su margen en
  `frontend/src/shared/ui/RichTextRenderer.tsx` (6, y 7 o 10 de margen), la
  marca de galería de `frontend/src/entities/project/ui/ProjectCard.tsx` (16),
  los dos iconos de `frontend/src/pages/about/ui/AboutPage.tsx` (32) y el de
  `frontend/src/shared/ui/ErrorBoundary.tsx` (80). Cada uno gana su test, y
  `AboutPage` su primer fichero de tests.
- **El registro** gana el dominio `interface` en `tools/board/domains.txt`,
  con las dos abiertas.
- **Las correcciones del ejemplo React del 2026-11-23** ya las repasó la
  entrega anterior: el producto no conserva código de la muestra. Sus cuatro
  reglas se miraron aquí contra el producto: la raíz no fija tamaño de letra;
  las cadenas sin espacios se parten en Contacto y en la terminal del 404; los
  identificadores salen de `useId()` y los fijos son anclas de una vez por
  página; y el producto no borra elementos con el foco dentro.

**Cómo se verificó.**

- **Al arrancar,** sobre `d1aa16c` y con el árbol limpio: `.\dev.cmd verify`,
  `RESULT: 9 puertas, 0 en rojo` (403 tests de la aplicación).
- **Cada test se vio fallar** devolviendo los valores originales con los tests
  nuevos puestos: 7 fallidos de 410. Los tests ponen la letra de la raíz a 24
  píxeles y leen el tamaño calculado, porque jsdom resuelve `rem`. Mensajes:
  `expected '12px' to be '18px'` (el punto), `expected [ '6px', '6px' ] to
  deeply equal [ '9px', '9px' ]`, `expected '10px' to be '15px'` y `expected
  '7px' to be '10.5px'` (la viñeta y su margen), `expected '16px' to be
  '24px'` (la marca de galería), `expected [ '32px', '32px' ] to deeply equal
  [ '48px', '48px' ]` (Sobre mí) y `expected '80px' to be '120px'` (la pantalla
  de error). Con la corrección, `RESULT: 410 tests, 0 fallidos, 0 con error`.
- **Nada cambia al tamaño por defecto.** En Chrome 157, sobre el build servido
  con `.\dev.cmd start --preview`, se volcó la caja y el estilo calculado de
  cada elemento de las 14 páginas (7 rutas en español y bajo `/en`) a 1280 por
  800 antes y después: 4318 elementos en claro y otros tantos en oscuro, 4332
  en Liquid Glass, 0 diferencias y la misma altura de documento. A 320 píxeles
  y con zoom al 200 %, la misma altura en las 14.
- **Lo que sí cambia, con la letra a 24 píxeles** a 1280 de ancho: de 1316
  textos, iconos y controles, antes crecían vez y media 1160 y ahora 1202. Los
  42 que se ganan son las 20 marcas de galería, las 14 viñetas, los 4 puntos
  de estado y los 4 iconos de Sobre mí. El icono de la pantalla de error,
  forzada bloqueando el fragmento de una página, medía 80 píxeles con la letra
  a 16 y a 24, y ahora 80 y 120. Los 114 que siguen sin crecer son iconos que
  dimensiona Material UI (34 y 14 de botón, 28 de los selectores, 20 de
  etiqueta) y 18 textos dibujados del duende: la primera abierta.
- **El resto del recorrido,** igual antes que después: 42 visitas (14 páginas
  por 3 temas) sin eventos de consola ni peticiones fallidas; ningún
  desplazamiento horizontal ni texto cortado a 320 píxeles en los tres temas,
  ni al 200 % de zoom en claro y en oscuro; contraste mínimo medido 4,64 en claro, 5,31 en
  oscuro y 6,75 en Liquid Glass sobre fondo liso. Con teclado y menos
  movimiento pedido: 29 paradas en Inicio, 15 en Sobre mí, 14 en Habilidades y
  en Experiencia, 40 en Proyectos, 21 en Contacto, 22 en el 404, 6 en el cajón
  del móvil, 13 en la galería, 2 en el menú de idioma y 4 en el de tema, todas
  con su foco dibujado y a la vista salvo la opción «Animaciones»
  deshabilitada, que no dibuja nada, y el campo de la terminal, que solo
  muestra su cursor: la segunda abierta. Fuera de lo pedido se miró 320
  píxeles con la letra a 24: cuatro páginas se desplazan de lado (101 píxeles
  en Sobre mí, 146 en Habilidades y 77 en Experiencia en los dos idiomas) y 16
  etiquetas se cortan, igual antes que después.
- **El build:** 165 ficheros antes y después; cambian los fragmentos de
  JavaScript de las páginas tocadas y los shells que los nombran, y ni una
  hoja de estilo, imagen, icono, copia markdown, `llms.txt`, `robots.txt` o
  mapa del sitio.
- **Las órdenes escritas se ejecutaron:** `status`, `verify`, `verify --` con
  etiquetas, `tests`, `format-fix`, `build`, `start` y `start --preview` con
  `--port`, y `stop`; y la de la tarjeta social, con Chrome, da un PNG de 1200
  por 630 como el JPEG publicado. Con una demo en marcha el lanzador rechaza
  la segunda, que es lo que el documento dice.
- **Al terminar:** `.\dev.cmd verify`, `RESULT: 9 puertas, 0 en rojo`, con
  830 checks del tablero, 28 comprobaciones de documentos sin hallazgos y 410
  tests de la aplicación, repetida hasta que el veredicto no cambió. La
  primera corrida completa cazó un fragmento entre comillas invertidas de
  `portfolio-conventions` que se leía como una ruta que no existe, y se
  corrigió.

**Pendiente.**

- Las dos abiertas, que son del dueño: hasta dónde sigue la interfaz el tamaño
  de letra y qué dibuja el foco en dos controles. No se corrigieron porque
  cualquier salida cambia el aspecto o decide algo que nadie ha decidido.
- **Ninguna regla de lint impide volver a escribir un número en el tamaño de
  un icono.** Lo sujetan los siete tests nuevos, sitio por sitio; una regla
  sería una pieza nueva de `frontend/eslint.config.js` y no se pidió.
- **`OPERATIONS.md`, `ARCHITECTURE.md` y las tres copias de `docs/es/` siguen
  declarados `closed`** en `tools/board/documents.txt` y enlazados desde el
  `README.md` como guías. Se han puesto al día, pero el tablero no comprueba
  sus citas ni sus enlaces; pasarlos a vivos es una decisión del dueño, porque
  obliga a que cada fragmento que citan resuelva.
- **En el servidor de desarrollo, la ruta que no existe acabó en la pantalla
  de error** tres veces seguidas, con una respuesta 504 de Vite al pedir dos
  iconos que solo usa esa página; en el build servido no ocurre. No se pudo
  repetir en un arranque limpio: después de haber arrancado una vez,
  `.\dev.cmd start` agotó tres veces seguidas su espera de salud de minuto y
  medio, al menos una de ellas con otro repositorio corriendo sus puertas en
  la misma máquina; la vista previa del build arrancó cada vez. Son dos
  hallazgos del entorno de desarrollo sin causa confirmada, y ninguno toca lo
  que se publica.
- **No se comprobó** Firefox, Safari ni Edge, un lector de pantalla, un
  dispositivo táctil real, el contraste forzado, la página impresa ni el envío
  del formulario de contacto.
