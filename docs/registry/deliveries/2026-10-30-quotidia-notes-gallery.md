---
title: La galería de Quotidia muestra Notas
date: 2026-10-30
phase: none
---
**Objetivo y dueño:** mantenimiento de contenido pedido por el dueño con la
publicación de Quotidia 1.7.0 (22), cuya novedad es Notas. No abre una fase ni
cambia lógica, componentes, dependencias o contratos de navegación del
portafolio.

**Qué cambió.**

- `quotidia/04` pasa a `04-quotidia_notes-folders`: la toma 4 de la campaña de
  Quotidia en inglés, que desde la 1.7.0 muestra Notas con sus carpetas, dos
  notas fijadas y las demás, en lugar del Resumen. Sus textos alternativos lo
  describen en los dos idiomas.
- Las descripciones del proyecto nombran las notas junto a tareas, eventos,
  metas y diario.
- `gonzaloapps-site/02` pasa a `02-gonzaloapps-site_quotidia-with-notes`: la
  página inglesa de Quotidia en `gonzaloapps.es`, que ahora nombra las notas en
  su descripción. Su texto alternativo lo dice.
- Las variantes anteriores se retiran, y las bases nuevas cambian de nombre para
  invalidar la caché inmutable.

**Cómo se verificó.** La base pasó `python verify.py` antes de modificarla. La
toma 4 sale de `branding/screenshots/phone/generated/en/04-notes.png` de
Quotidia, compuesta y comprobada por su compositor; la de `gonzaloapps.es` se
capturó con Edge sin interfaz, en modo oscuro, a 1920 por 1080, después de
comprobar que la página publicada ya decía «journal and notes» y servía la toma
nueva. Las tres variantes WebP de cada una salen a calidad 82 con ffmpeg. La
puerta completa pasó con sus puertas en verde.
