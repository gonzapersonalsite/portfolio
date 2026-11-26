---
title: Capturas de NutriManager rehechas, el andamio fuera de las estadísticas de lenguaje y el perfil alineado
date: 2026-11-26
phase: none
---
**Objetivo y dueño:** producto (las capturas) y herramientas de desarrollo
(`.gitattributes`); cierra lo que `#2026-11-26-workbench-cross-review-and-finish`
dejó pendiente fuera de `F3.4`. No abre ni cierra ninguna fase ni tramo.
Palabras del dueño: «lo de nutrimanager podrias hacerlo desde 0», «si es algo a
hacer hazlo pues. quiero mi github, linkeding y portafolio al dia y
correctamente alineado mi perfil profesional» y, cuando vio la primera tanda,
«Recaptura con barra» y «pon las ventanas que abres centradas en la pantalla».

**Capturas de NutriManager rehechas, a petición del dueño.** Las cuatro
anteriores mostraban una interfaz que la aplicación ya no tiene (lista de
pacientes y menús retirados). El dueño pidió rehacerlas compilando el código
actual con un par de claves nuevo de su License Generator.

- **Cómo se hicieron:** una copia temporal del commit `5420c43` del repositorio
  `nutrimanager`, con la clave pública nueva, compilada para Windows dentro de
  la imagen oficial del SDK de .NET 8.0.426; la licencia la generó el dueño para
  este equipo. La misma clave va al repositorio `nutrimanager` en un commit
  suyo, por orden del dueño; la copia compilada y sus datos son temporales y no
  entran aquí.
- **Datos:** todos ficticios. Ingredientes, recetas, patologías y una plantilla
  semanal sembrados en la base de datos, y la paciente y sus dos visitas creadas
  desde la propia aplicación, que es la que calcula el IMC, el estado
  nutricional, el metabolismo basal y las necesidades calóricas.
- **Qué entra:** cinco capturas con nombre nuevo, por la caché inmutable, y sus
  tres variantes WebP (ventana de `1920×1080` reducida a `1440×810`, tema oscuro,
  interfaz en inglés): la ficha durante una visita, los datos de la persona, la
  activación, la elección entre plantilla y dieta nueva, y la dieta semanal con
  su resumen. Los textos alternativos describen lo que cada una enseña.
- **Solo la ventana:** cada imagen se pinta desde la propia ventana de la
  aplicación (`PrintWindow`), no copiando un trozo de pantalla, así que nada de
  lo que haya delante o detrás entra en ella. La portada va a `16:9`, que es lo
  que el test de portadas exige.

**Estadísticas de lenguaje en GitHub.** GitHub presentaba el repositorio como un
proyecto Python porque contaba el andamio (832 kB de Python frente a 507 kB de
TypeScript). `.gitattributes` marca `tools/` y `verify.py` como
linguist-vendored, que los saca de esa cuenta sin cambiar nada más.

**Fuera del repositorio, aplicado con el cambio ya publicado.** El dueño lo
ordenó junto con el push («Sí, empuja y aplica»).

- **Sitio publicado:** el pie enseña la versión 2.0.0, la consola sale limpia y
  `/en/projects` no desborda a `1440 px`.
- **GitHub, repositorio `portfolio`:** la descripción nombra el sistema visual
  propio en CSS y ya no MUI; el tema `material-ui` sale y entra `css`; la tarjeta
  social nueva está subida como *Social preview* (`1200×630`).
- **GitHub, README del perfil:** la fila y la frase del portafolio describen el
  sistema visual propio.
- **LinkedIn:** el proyecto «Portafolio profesional» cuenta el sistema visual
  propio y que en noviembre de 2026 sustituyó a Material UI, así que la aptitud
  Material-UI que lleva asociada sigue siendo cierta; la caché de vista previa
  de la web y del repositorio se refrescó, y las miniaturas del proyecto y de
  «Destacados» enseñan la tarjeta nueva.

**Cómo se verificó.**

- **Los tests que lo frenaron:** la primera tanda, a `16:10` y con un texto
  alternativo de 268 caracteres, dejó la puerta `tests` en rojo en dos casos de
  `frontend/src/entities/project/api/data.test.ts`: la portada no iba a la
  proporción de la tarjeta y un texto pasaba de los 250 caracteres. Con las
  capturas a `16:9` y los textos acortados, los dos pasan.
- **Las imágenes:** las quince variantes existen con el nombre que
  `frontend/src/entities/project/api/data.json` declara, las doce anteriores
  salen y ningún fichero las nombra ya.
- **Las puertas:** `.\dev.cmd verify`, `RESULT: 9 puertas, 0 en rojo` con 496
  tests, repetida hasta que el veredicto no cambió.

**Pendiente.** Nada de esta entrega. La revisión visual final del dueño sigue
siendo lo que cierra `F3`, como dice `docs/ROADMAP.md`.
