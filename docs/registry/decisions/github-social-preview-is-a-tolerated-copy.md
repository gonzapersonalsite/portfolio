---
title: La vista previa social del repositorio en GitHub es una copia de la tarjeta, tolerada y con su paso escrito
state: confirmed
date: 2026-10-27
phase: none
---
**La vista previa social del repositorio `gonzapersonalsite/portfolio` en GitHub
es una copia de la tarjeta de `frontend/public/` que se sube a mano, y se
tolera.** De las tres salidas que da `AGENTS.md` §4 para un dato en dos sitios,
esta es la tolerancia registrada:

- **Motivo:** GitHub no ofrece API para subir esa imagen, solo la página
  *Settings → General → Social preview*, y una puerta que comparase las dos
  copias necesitaría red.
- **Disparador:** cada vez que cambia la tarjeta social. El paso está en
  `OPERATIONS.md` y su copia en español, junto al refresco en LinkedIn Post
  Inspector y Facebook Sharing Debugger, que también es manual.

Lo propone el agente después de que el dueño encontrara en GitHub la tarjeta
anterior, con `GONZALO.DEV`, que ningún inventario había visto
(`#visible-brand-is-the-owner-name`). El dueño subió la tarjeta nueva el
2026-10-27, y la imagen publicada coincide píxel a píxel con la del
repositorio.

No abre fase: es un paso de operación, no una funcionalidad.

## Refutación

- **Evidencia en contra:** un paso manual se olvida, y este se olvidó: la copia
  quedó dos versiones atrás sin que nada avisara. Quitar la vista previa propia
  (*Remove*) deja que GitHub genere su tarjeta a partir del nombre y de la
  descripción del repositorio, que se cambia con `gh repo edit`, y elimina la
  copia.
- **Lo que se mantiene y por qué:** el dueño quiere que el enlace al
  repositorio muestre la misma tarjeta que la web, y ha subido la nueva. El
  paso queda en la misma lista que los otros refrescos manuales tras el
  despliegue, que es donde se mira al cambiar la tarjeta. Si se prefiere no
  mantener la copia, basta con quitarla en GitHub y borrar esa frase de los dos
  `OPERATIONS.md`.

2026-10-27: el dueño elige esta opción entre las que le puso el agente. Queda
provisional hasta que la confirme después de releer esta refutación.

2026-10-27: el dueño la confirma después de leer esta refutación.
