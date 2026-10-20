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
- **Dynamic Localization:** full bilingual support (Spanish/English) with instant interface and content translation, Spanish root routes and dedicated `/en` routes (plus `?lang=es|en` query overrides) so sharing any URL preserves the active language and its localized social preview.

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

📖 **[Feature-Sliced Design Architecture Contract](docs/ARCHITECTURE.md)** — Canonical FSD layer, slice and import rules.
📖 **[Architecture Guide](ARCHITECTURE.md)** — Patterns and design decisions.
🛠️ **[Operations Guide](OPERATIONS.md)** — Deployment, CI/CD, environment variables, content management and local setup.

---

## 🚀 Running Locally

### Prerequisites
- Node.js (see `frontend/package.json` for the managed version), pnpm, and Python 3.

### Start Application
```bash
git config core.hooksPath .githooks
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
