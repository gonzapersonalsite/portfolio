---
title: La marca gonzalo.dev sale del portafolio y la sustituye el nombre del dueño
date: 2026-10-27
phase: none
---
**Objetivo y dueño:** producto; cambio de marca dictado por el dueño. No abre
fase. Decisiones: `#visible-brand-is-the-owner-name`,
`#public-role-is-full-stack-developer` (pasa a confirmada),
`#brand-accent-marks-the-surname` e `#icon-keeps-the-g-monogram-dot`
(propuestas, provisionales).

**Qué cambió.**

- `logoText` pasa de `GONZALO.DEV` a `GONZALO MARTÍNEZ`. La marca de la barra
  ya no parte el texto por el punto: pinta la última palabra en el color de
  acento, y en móvil su tamaño se ajusta al ancho para caber a 320 px. El
  comentario que nombraba la marca anterior sale.
- La pantalla de arranque de `frontend/index.html` dice `GONZALO MARTÍNEZ`, con
  el apellido atenuado por la regla CSS que ya existía.
- Vista previa social nueva, `og-cover-gonzalo-martinez-full-stack.jpg` (JPEG
  1200×630, calidad 85), rehecha en Edge headless sin el logotipo;
  `og:image`, `twitter:image` y los dos textos alternativos, idénticos, la
  siguen. La anterior se retira. El HTML de la tarjeta anterior no se había
  guardado; el de esta queda versionado en
  `frontend/tooling/og-cover/og-cover.html`, con el modo de renderizarlo.
- Los iconos pasan a `g-monogram.svg`, `g-monogram.ico` y `g-monogram-180.png`,
  con el mismo contenido, y `frontend/index.html` los enlaza.
- Las capturas 00, 02 y 03 del proyecto `portfolio` se rehicieron desde el
  build de producción en modo oscuro, a 1440 px y sin marco, con nombres nuevos
  (`*-name-brand-en`); el alt de la portada menciona ahora el duende.
- La tarjeta del proyecto `portfolio` deja de afirmar un pipeline de GitHub
  Actions: la verificación es el hook pre-push local, y la tecnología
  `GitHub Actions` pasa a `Git Hooks`. `OPERATIONS.md` y su copia en español
  dicen lo mismo.
- Los textos alternativos de la portada de `gonzaloapps-site` dejan de decir
  «software studio».
- Documentación al día: la skill `portfolio-conventions`, `OPERATIONS.md`,
  `ARCHITECTURE.md`, `docs/ARCHITECTURE.md` y sus copias en español nombran los
  ficheros nuevos y ya no la marca.

**Cómo se verificó.** Al arrancar, `python verify.py` sobre `af3e3dd` terminó
con código 0 y nueve puertas en verde (728 comprobaciones del tablero). Se
reintrodujo el defecto original: con el componente que parte por el punto, los
tests del menú móvil fallaron con `GONZALO MARTÍNEZ.` (el punto colgante); con
`GONZALO<span>.DEV</span>` en el arranque, falló el test nuevo que cruza esa
marca con `logoText`. Restaurado el código, volvieron a verde; la suite de
Vitest pasa con 403 pruebas. En navegador, la marca no desborda a 320, 340,
360, 390, 599, 600, 768, 1199, 1200 y 1280 px, en inglés y en español; a
320 px queda a 15 px de los selectores. En la tarjeta social, el nombre ocupa
x 303–895 y el puesto x 420–782, dentro del cuadrado central (285–915), y todo
el texto queda a más de 64 px de cada borde. Renderizado de nuevo desde su
ubicación versionada, el texto ocupa los mismos píxeles; solo cambia el ruido
del degradado (8 píxeles difieren en más de 8 niveles).

**Pendiente.** La captura 01 del proyecto `portfolio` y las 00 y 03 de
`gonzaloapps-site` esperan a que `gonzaloapps.es` publique su banner sin
`SOFTWARE STUDIO`: la 01 muestra la portada de `gonzaloapps-site`. Irán en un
segundo commit. El dueño eligió las dos propuestas; siguen provisionales hasta
que las confirme tras releer su refutación. Tras el despliegue, el dueño
refresca la vista previa en LinkedIn Post Inspector y Facebook Sharing
Debugger, y revisa si el CV de Drive lleva la marca.
