---
title: Las capturas que mostraban el banner antiguo de gonzaloapps.es se rehacen
date: 2026-10-27
phase: none
---
**Objetivo y dueño:** producto; cierra lo que la entrega
`#2026-10-27-visible-brand-owner-name` dejó a la espera de que `gonzaloapps.es`
publicara su banner sin `SOFTWARE STUDIO`. Decisión:
`#visible-brand-is-the-owner-name`.

**Qué cambió.**

- `gonzaloapps-site/00` pasa a `00-gonzaloapps-site_home-wordmark`: la portada
  inglesa de `gonzaloapps.es` con el banner nuevo, recortada a 896×504 para que
  sea 16:9 exacto sin que asome la ficha siguiente, porque la portada lista
  ahora más aplicaciones. `fullWidth` pasa de 928 a 896.
- `gonzaloapps-site/03` pasa a `03-gonzaloapps-site_es-wordmark`: la portada en
  español a 1440×900, que ahora muestra Quotidia, License Generator y Rememora;
  su texto alternativo lo dice.
- `portfolio/01` pasa a `01-portfolio_projects-name-brand-en`: la página de
  proyectos del build de producción, con la marca nueva, la portada nueva de
  Gonzalo Apps y la ficha de Quotidia disponible en Google Play.
- Las variantes anteriores se retiran.

**Cómo se verificó.** El banner publicado (`masthead.jpg?v=f3cc77dc6833`) se
miró antes de capturar: dice `gonzaloapps.es` sin `SOFTWARE STUDIO`. Las
capturas se hicieron como las de la entrega anterior, con Edge por su
protocolo de depuración, en modo oscuro y sin marco; las tres variantes WebP
salen a calidad 82 con ffmpeg. Los tests de datos pasan con las proporciones y
los anchos nuevos.

**Pendiente.** `#brand-accent-marks-the-surname` e
`#icon-keeps-the-g-monogram-dot` siguen provisionales hasta que el dueño las
confirme tras releer su refutación.
