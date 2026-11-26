# 🚀 Professional Portfolio

[![License: Evaluation Only](https://img.shields.io/badge/License-Evaluation--Only-red)](LICENSE)

🇺🇸 **English** | [🇪🇸 Español](docs/es/README.md)

**Professional Portfolio** is a static, bilingual web application that presents the career of Gonzalo Martínez, Full Stack Developer: projects, experience, skills and profile, with a responsive interface and light/dark themes.

**Live Demo:** [https://mi-portafolio-gonzalo.vercel.app/](https://mi-portafolio-gonzalo.vercel.app/)

---

## ✨ Key Features

### 🎨 Crafting-Bench Experience (UX)
- **Mesa de Taller Interface:** Technical drafting-table aesthetic across Light and Dark modes, subtle grid surface, tactile borders, and a dedicated rig bay hosting an animated handmade pixel-art mascot (`PixelGoblin`).
- **Interactive Project Gallery:** Native `<dialog>` full-screen viewer with captions, thumbnail strip, zoom up to 4× (buttons, click, or keyboard), touch swipe support, and deterministic keyboard focus return.
- **Preview & Architecture Mode:** Flagship and regular project cards switch directly between product preview (`Vista` / `Preview`) and technical architecture breakdown (`Arquitectura` / `Architecture`).
- **Theme Engine & Motion Control:** Light and Dark modes driven by CSS custom properties. The site follows the operating system until the visitor picks a theme, keeps legacy `'glass'` storage safely falling back to OS preference without overwriting it, and provides a direct animation pause toggle respecting `prefers-reduced-motion`.
- **Dynamic Localization:** full bilingual support (Spanish/English) with direct `ES` / `EN` route switching, Spanish root routes and dedicated `/en` routes (plus `?lang=es|en` query overrides) so sharing any URL preserves the active language and its localized social preview.

### 📦 Content as Data
- **Static JSON content model:** projects, skills (with concrete applied examples), experience, profile, and spoken languages live in versioned JSON files — no CMS, no API, no database. Adding a project is a data change, not a code change.
- **Self-hosted assets:** every image, icon and font (self-hosted Inter Variable with technical alternates) is served from the site itself — zero third-party image or font hosts.
- **Contact form:** powered by EmailJS (browser-only, no backend required), loaded only when a message is sent.
- **Responsive Design:** fluid CSS Grid and Flexbox layouts with native accessible controls optimized for desktop, tablet, and mobile devices down to 320 px with enlarged text.

---

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **UI & Styling:** Native semantic HTML, custom SVGs, and co-located CSS with CSS custom property tokens (zero MUI or Emotion dependencies anywhere in source or lockfile)
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

📖 **[Feature-Sliced Design Architecture Contract](docs/ARCHITECTURE.md)** — Canonical FSD layer, slice and import rules.
📖 **[Architecture Guide](ARCHITECTURE.md)** — Patterns and design decisions.
🎨 **[Design Guide](DESIGN.md)** — Who the interface is for, the visual decisions taken, where they are made and how to check them (in Spanish).
🛠️ **[Operations Guide](OPERATIONS.md)** — Deployment, CI/CD, environment variables, content management and local setup.

---

## 🚀 Running Locally

### Prerequisites
- Docker with Linux containers and Compose (plus Git to enable hooks); Node.js, pnpm and Python run inside the project containers.

### Start Application
```bash
git config core.hooksPath .githooks
./dev prepare   # Windows: .\dev.cmd prepare
./dev start     # Windows: .\dev.cmd start
```

**Access the application:**
- Frontend: [http://127.0.0.1:5173/](http://127.0.0.1:5173/) (stop with `./dev stop` / `.\dev.cmd stop`)

### Quality Gates
```bash
./dev verify                      # Windows: .\dev.cmd verify — runs all 9 repository and frontend gates; the full run is the pre-push hook's
./dev verify -- <label>           # Windows: .\dev.cmd verify -- <label> — before a commit, the gates the change can move
./dev format-fix                  # Windows: .\dev.cmd format-fix — Prettier formatting fix
./dev build                       # Windows: .\dev.cmd build — TypeScript compilation + Vite production build
```

For updating the scaffold or template pieces from the catalog, see `docs/ACTUALIZAR.md`.

---

## 🚫 Legal Notice

**© 2026 Gonzalo Martínez García. All rights reserved.**

This software is **proprietary** and is provided for **evaluation purposes only**.
- **Unauthorized copying**, modification, distribution, or use of this software, via any medium, is strictly prohibited.
- **Personal use for other portfolios is not allowed.**
- See the [LICENSE](LICENSE) file for full terms and conditions.

---

**Developed by Gonzalo Martínez García**
*Full Stack Developer | Software Engineering & Innovation*
