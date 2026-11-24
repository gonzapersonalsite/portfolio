# Puertas, pruebas, herramientas y su medición (índice)

GENERADO por tools/board desde `docs/registry/decisions/` y `docs/registry/lessons/`. No editar a mano: se reescribe.
board-fingerprint:bfd17bc7ab0e8509 — su contenido cambió por última vez el 2026-11-24.

Cada decisión y cada lección del dominio `verification`, por identidad; todas rigen hoy. Antes de tocar este
sistema se consulta esta página. El índice principal es `docs/registry/DECISIONS.md`.

## CONFIRMADAS (2)

- `#eslint-forbids-fixed-font-sizes-and-vite-ignores-pnpm-store` — La regla de tamaño relativo y el filtro del servidor de desarrollo guardan las puertas de verificación (CONFIRMED 2026-11-24) · none
- `#hook-activation-is-a-per-clone-step` — Activar el hook de pre-push es un paso por clon, no una puerta (CONFIRMED 2026-09-21)

## Lecciones (4)

- `#lesson-a-script-error-is-not-red` Un error de script no es rojo por sí solo, es verde falso o cuelgue
- `#lesson-a-silent-suite-reads-as-green` Una suite que no ejecuta un solo check se lee exactamente igual que una verde
- `#lesson-an-injected-defect-changes-a-value-never-removes-a-use` Para ver fallar un test, cambia un valor o una comparación; nunca quites el uso de un símbolo
- `#lesson-the-watchdog-lives-outside-the-gate` Una guarda dentro del proceso no protege contra el proceso que no llega a construirla
