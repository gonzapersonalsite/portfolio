---
title: Adopt agentic-scaffold, react-vite layer and react-fsd stack
date: 2026-10-18
phase: H0
---
**Adopt agentic-scaffold, react-vite layer and react-fsd stack.**
Unifies `portafolio` onto the canonical `agentic-scaffold` engine,
`layer:react-vite`, and `stack:react-fsd` from `templates` commit
`39bead6c761666ac5f5648e83bf89a4265d07aaf`, following
`#this-repository-uses-the-agentic-scaffold`.

- **Scaffold and hooks:** instantiated `agentic-scaffold` and `layer:react-vite`
  at the repository root while preserving `frontend/` so Vercel's live
  deployment contract (`Root Directory: frontend`) remains intact. Replaced
  `.husky/` with `.githooks/commit-msg` (`tools/board/commit_message.py`) and
  `.githooks/pre-push` (`tools/board/pre_push.py`). Per-clone hook activation
  remains `#hook-activation-is-a-per-clone-step`.
- **Formatting and gates:** removed `husky`, `lint-staged`, and
  `eslint-config-prettier` from `frontend/package.json`, added `prettier`
  (`3.9.10`), `frontend/.prettierrc.json`, and `frontend/.prettierignore`
  (excluding `frontend/index.html` to preserve the inline theme script's CSP
  `sha256` hash in `frontend/vercel.json`), and configured all nine gates in
  `gates.txt` (`board: tests`, `board: build`, `board: documents`,
  `dependencies`, `format`, `lint`, `typecheck`, `tests`, `build`).
- **Stack adoption (`stack:react-fsd`):** synced `frontend/eslint.config.js`
  (`FSD_ALIAS`), `frontend/eslint.config.test.ts`, and XML escaping in
  `frontend/tooling/agent-files/sitemap.ts`, and recorded `stack:react-fsd` in
  `tools/board/components.txt`.
- **Verification:** `python -I verify.py` passes all 9 gates (`0 en rojo`), and
  `upgrade.py` reports 0 pending changes against `templates` `39bead6`.
