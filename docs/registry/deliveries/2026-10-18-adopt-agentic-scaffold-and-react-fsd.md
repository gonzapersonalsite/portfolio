---
title: Adopción de agentic-scaffold, la capa react-vite y el stack react-fsd
date: 2026-10-18
phase: H0
---
**Adopción de agentic-scaffold, la capa react-vite y el stack react-fsd.**
Unifica `portafolio` sobre el motor canónico de `agentic-scaffold`,
`layer:react-vite` y `stack:react-fsd` desde el commit
`39bead6c761666ac5f5648e83bf89a4265d07aaf` de `templates`, siguiendo
`#this-repository-uses-the-agentic-scaffold`.

- **Andamio y hooks:** se instanció `agentic-scaffold` y `layer:react-vite` en
  la raíz del repositorio manteniendo `frontend/` para conservar el contrato de
  despliegue de Vercel (`Root Directory: frontend`). Se sustituyó `.husky/` por
  `.githooks/commit-msg` (`tools/board/commit_message.py`) y
  `.githooks/pre-push` (`tools/board/pre_push.py`). La activación por clon se
  rige por `#hook-activation-is-a-per-clone-step`.
- **Formato y puertas:** se eliminaron `husky`, `lint-staged` y
  `eslint-config-prettier` de `frontend/package.json`, se añadieron `prettier`
  (`3.9.10`), `frontend/.prettierrc.json` y `frontend/.prettierignore`
  (excluyendo `frontend/index.html` para conservar el hash CSP `sha256` del
  script de tema inline en `frontend/vercel.json`) y se configuraron las nueve
  puertas en `gates.txt` (`board: tests`, `board: build`, `board: documents`,
  `dependencies`, `format`, `lint`, `typecheck`, `tests`, `build`).
- **Adopción del stack (`stack:react-fsd`):** se sincronizaron
  `frontend/eslint.config.js` (`FSD_ALIAS`), `frontend/eslint.config.test.ts` y
  el escapado XML en `frontend/tooling/agent-files/sitemap.ts`, y se registró
  `stack:react-fsd` en `tools/board/components.txt`.
- **Verificación:** `python -I verify.py` pasa las 9 puertas (`0 en rojo`), y
  `upgrade.py` informa 0 cambios pendientes frente al commit `39bead6` de
  `templates`.
