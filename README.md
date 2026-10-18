# 🚀 Professional Portfolio

[![License: Evaluation Only](https://img.shields.io/badge/License-Evaluation--Only-red)](LICENSE)

🇺🇸 **English** | [🇪🇸 Español](docs/es/README.md)

**Professional Portfolio** is a static, bilingual web application that presents the career of Gonzalo Martínez, Junior Full Stack Developer: projects, experience, skills and profile, with a responsive interface and three visual themes.

**Live Demo:** [https://mi-portafolio-gonzalo.vercel.app/](https://mi-portafolio-gonzalo.vercel.app/)

---

## ✨ Key Features

### 🎨 Immersive User Experience (UX)
- **Liquid Glass Interface:** Cutting-edge visual style inspired by visionOS, featuring advanced glassmorphism and neon accents.
- **Interactive Project Gallery:** full-screen viewer with captions, a thumbnail strip, zoom up to 4× (buttons, click or keyboard) and keyboard navigation (arrows, +/−, 0).
- **Theme Engine:** Light, Dark and the exclusive Liquid Glass mode. The site follows the operating system until the visitor picks a theme, and paints the right background before the app loads.
- **Dynamic Localization:** full bilingual support (English/Spanish) with instant interface and content translation. Adding `?lang=es` to any address shares the page in Spanish.

### 📦 Content as Data
- **Static JSON content model:** projects, skills, experience, profile, and spoken languages live in versioned JSON files — no CMS, no API, no database. Adding a project is a data change, not a code change.
- **Self-hosted assets:** every image, icon and font (Inter) is served from the site itself — zero third-party image or font hosts.
- **Contact form:** powered by EmailJS (browser-only, no backend required), loaded only when a message is sent.
- **Responsive Design:** fluid layouts optimized for desktop, tablet, and mobile devices.
- **Ambient Glass Background:** static radial gradients provide depth without continuously animating behind the glass surfaces.

---

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **UI Framework:** Material UI (MUI) with deep theme customization
- **Routing:** React Router with lazy-loaded pages
- **i18n:** i18next + react-i18next
- **Contact:** EmailJS (browser-only)
- **Testing:** Vitest + Testing Library
- **Package Manager:** pnpm
- **Hosting:** Vercel (static files only)

---

## 🏗️ Architecture & Principles

The project follows a modern **static frontend architecture**, prioritizing maintainability, performance, and zero operational cost.

- **Feature-Sliced Frontend:** 6-layer FSD architecture (`app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`) with strict import boundaries enforced by ESLint.
- **Static Content Model:** bilingual content in JSON per entity, validated by data-integrity tests.
- **Continuous Deployment:** Vercel deploys every push to `main`; local pre-push gates run all repository and frontend checks before publishing.
- **Agent-Readable Output & SEO:** one HTML page per route with its own metadata and JSON-LD structured data, plus llms.txt, robots/sitemap and English/Spanish markdown twins per route, all generated at build time from the same JSON content.
- **Security Headers:** a strict Content-Security-Policy (the only inline script is allowed by its hash) and the usual hardening headers on every response.

📖 **[Architecture Guide](ARCHITECTURE.md)** — Patterns and design decisions.
🛠️ **[Operations Guide](OPERATIONS.md)** — Deployment, CI/CD, environment variables, content management and local setup.

---

## 🚀 Running Locally

### Prerequisites
- Node.js (see `frontend/package.json` for the managed version) and pnpm.

### Start Application
```bash
pnpm --dir frontend install
pnpm --dir frontend dev
```

**Access the application:**
- Frontend: [http://localhost:5173/](http://localhost:5173/)

### Quality Gates
```bash
python verify.py                      # Canonical runner: runs all 9 repository and frontend gates
pnpm --dir frontend run format:check  # Prettier formatting check
pnpm --dir frontend run lint          # ESLint: architecture (FSD) rules + TS rules; any warning fails it
pnpm --dir frontend run typecheck     # TypeScript strict solution check (tsc -b)
pnpm --dir frontend test              # Vitest: unit, content-integrity and architecture-rule tests
pnpm --dir frontend build             # TypeScript compilation + Vite production build
```

---

## 🚫 Legal Notice

**© 2026 Gonzalo Martínez García. All rights reserved.**

This software is **proprietary** and is provided for **evaluation purposes only**.
- **Unauthorized copying**, modification, distribution, or use of this software, via any medium, is strictly prohibited.
- **Personal use for other portfolios is not allowed.**
- See the [LICENSE](LICENSE) file for full terms and conditions.

---

**Developed by Gonzalo Martínez García**
*Junior Full Stack Developer | Software Engineering & Innovation*

## Trabajar aquí

1. `AGENTS.md` es el contrato de contribución y se lee entero al empezar cada
   sesión; la herramienta de IA lo carga por su adaptador (las filas `adapter`
   de `tools/board/documents.txt`) o lo lee directamente.
2. Una vez por clon: `git config core.hooksPath .githooks`, para que ningún
   commit entre sin su mensaje comprobado ni ningún push salga sin pasar las
   puertas. En Windows, con rutas profundas, también
   `git config core.longpaths true`: una identidad del registro puede llegar a
   los caracteres que permite `tools/board/limits.txt`.
3. `python verify.py` en verde antes de tocar nada y antes de dar algo por
   listo (donde `python` no es Python 3, `py -3` en Windows o `python3` en
   macOS y Linux). Las puertas son las filas de `gates.txt`.
4. Cómo va el proyecto se lee en `STATUS.txt`, que el tablero deriva del
   árbol; lo decidido, lo entregado y lo aprendido vive en `docs/registry/`.

## Qué hay

| Ruta | Qué es |
|---|---|
| `AGENTS.md` | Contrato de contribución, intemporal; cada herramienta lo carga por su adaptador |
| `verify.py`, `gates.txt` | Runner de puertas y su lista ejecutable, con las guardas de los runners de tests |
| `docs/ROADMAP.md`, `docs/TOOLING.md` | Los dos planes: producto (F) y andamio (H) |
| `docs/archive/` | Cuerpos de las fases y tramos cerrados |
| `docs/registry/` | Decisiones, lecciones y entregas, un fichero cada una, y sus índices |
| `STATUS.txt`, `docs/registry/DECISIONS.md`, `docs/registry/NOTES.md`, `docs/registry/index/` | DERIVADOS por el tablero |
| `tools/board/` | El tablero y sus tests, los scripts de los hooks, de la adopción, de la instanciación y de los componentes, sus ficheros de datos, el manifiesto del motor y, en una instancia, el registro de lo que incorporó (`components.txt`) |
| `tools/guards/` | Adaptadores que imprimen las guardas de los runners de tests que no las imprimen solos |
| `.githooks/` | `pre-push` corre las puertas antes de publicar; `commit-msg` comprueba cada mensaje |
| `.agents/skills/` | Skills del proyecto: procedimientos sin autoridad, indexados en el §9 del contrato |
