---
title: Portales pixel 2D laterales de entrada y salida y widget compartido en widgets/pixel-goblin para Inicio y Contacto
state: confirmed
date: 2026-10-19
phase: F1
---
**El duende entra y sale a través de portales pixel 2D laterales y se comparte
desde `widgets/pixel-goblin` entre Inicio y Contacto.** Dictado por el dueño en
cuanto al comportamiento de los portales de entrada/salida y elegido entre las
opciones propuestas para su paleta y su reutilización en Contacto (`F1.2`):

- **Portales pixel 2D de perfil con apertura/cierre desde el epicentro y
  partículas de fluctuación suave:** dos portales verticales de 17 filas de alto
  (`y = 3..54`, centrados en `y = 27` con epicentro geométrico en `pivot = 1.5,
  1.5`) divididos en tres anillos concéntricos (`core`, `rim`, `outer`) que se
  abren radialmente de dentro hacia afuera (`core -> rim -> outer`, curva única
  `EASE_OUT`) y se cierran de afuera hacia dentro (`outer -> rim -> core`, curva
  única `EASE_IN`), manteniendo estáticas las bandas internas del vórtice dentro
  de sus bordes y acotando la oscilación de las 8 partículas y la respiración
  del núcleo a la ventana activa `[openStart, closeEnd]` dentro del cronograma
  de 16 s. El portal izquierdo (`x = 18`) se abre al inicio del ciclo (`t =
  0.0020..0.0440`) y se cierra (`t = 0.1856..0.2336`) tras el cruce del duende;
  el derecho (`x = 366`) se abre con antelación (`t = 0.8008..0.8488`), absorbe
  al duende con `<clipPath>` (`x = 18..366`) y se cierra de afuera hacia dentro
  tras completar el cruce acelerado con `EASE_IN` (`t = 0.9640..0.9980`).
- **Paleta de acento por tema y cierre en reposo:** los portales usan colores
  acordes al tema (`90caf9` / `1976d2` / `fff8e1` en `light`; `4b35b8` /
  `5de0e6` / `e0f7fa` en `dark` y `glass`) y permanecen cerrados en la
  variante `resting` cuando las animaciones están pausadas o el sistema pide
  reducir el movimiento.
- **Bajada a `widgets/pixel-goblin` con proporciones 1:1 y aislamiento de
  repintado:** al aparecer el panel del formulario de `ContactPage` como segundo
  consumidor, el modelo y el componente bajan de `pages/home` a
  `widgets/pixel-goblin` (`PixelGoblin`), conforme a `docs/ARCHITECTURE.md`
  («Dónde va el código nuevo»). El `<svg>` fija `maxWidth: scene.width` (`384px`,
  `mx: 'auto'`) para mantener idéntica escala pixel 1:1 en Inicio y Contacto,
  aísla su repintado con `contain: layout style paint` y pausa el reloj SMIL
  mediante `IntersectionObserver` y `visibilitychange` cuando sale del viewport.

## Refutación

- **Evidencia en contra:** dejar que el duende apareciera y desapareciera en los
  bordes del `viewBox` ahorraba el `<clipPath>` y las capas de los dos portales;
  duplicar o envolver el componente dentro de cada página habría evitado crear
  un slice en `widgets/`.
- **Lo que se mantiene y por qué:** sobre una tarjeta acotada en medio de la
  página, aparecer de la nada en el borde del contenedor resultaba abrupto; el
  par de portales con `<clipPath>` justifica visualmente la entrada y la salida
  sin alterar la velocidad ni los pasos del duende, y `widgets/pixel-goblin`
  cumple la regla de fuente única de conocimiento entre `HomePage` y
  `ContactPage`.
