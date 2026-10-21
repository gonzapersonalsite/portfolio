# 🛠️ Operations Guide

[![License: Evaluation Only](https://img.shields.io/badge/License-Evaluation--Only-red)](LICENSE)

🇺🇸 **English** | [🇪🇸 Español](docs/es/OPERATIONS.md)

This document covers the infrastructure, deployment pipeline, environment configuration, and local development setup for the Portfolio project.

---

## ☁️ Infrastructure & Deployment

The project is **static-only** — a single deployment, zero servers.

### Cloud Provider
- **Frontend Hosting:** [Vercel](https://vercel.com) (optimized for React/Vite applications), root directory `frontend/`.

### 🚀 CI/CD Pipeline
- **Frontend (Vercel):**
  - Vercel auto-deploys on every push to `main` from the `frontend/` directory.
  - Vercel detects pnpm from `pnpm-lock.yaml`; pnpm then switches to the version pinned in the `packageManager` field of `frontend/package.json` (the build log shows which version ran).
  - Verification runs locally before pushing through `.githooks/pre-push` (`tools/board/pre_push.py`): it refuses to push anything but HEAD, or with uncommitted or untracked files, and runs `python -I verify.py` across all 9 repository and frontend gates (`gates.txt`); there are no GitHub Actions workflows.
  - esbuild's install script is approved in-repo by `allowBuilds: { esbuild: true }` in `frontend/pnpm-workspace.yaml`, the build-approval setting of pnpm 11 and later; every other dependency's install script stays blocked. Vercel needs no extra configuration.
  - Vercel dashboard: set Install Command to `pnpm install` and Build Command to `pnpm run build`.

### 🌐 Hosting configuration (`frontend/vercel.json`)
- **No rewrites:** every route is an HTML file of its own. Any other address, a missing asset or image included, gets `404.html` with status 404 (the app on that page renders `NotFoundPage` with navigation back to the home page). There is no `/favicon.ico`: pages link the icons in `/icons/`.
- **Security headers:** `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` on every response. The CSP allows scripts from the site plus the theme script inlined in `index.html` (by its `sha256` hash), inline styles (Emotion), images and fonts from the site only, and network requests to the site itself and EmailJS only.
  - If you edit the inline script in `index.html`, `pnpm test` fails and prints its new `'sha256-…'` value: put it in the CSP.
  - A new third-party service (analytics, fonts, embeds) needs its host in the matching CSP directive, or the browser blocks it. Vercel's preview toolbar is blocked too, on preview deployments only.
- **Cache:** `/assets/*`, `/images/*` and `/icons/*` are immutable for one year (see *Cache immutability* below); `index.html` is always revalidated.
- **Markdown twins** (`*.md`) are served with `X-Robots-Tag: noindex`: agents read them, search engines index the HTML pages.
- **After a deploy**, check with `curl -I`: `/about` and `/projects/` return 200 with their own `<title>`; `/nope` and `/assets/nope.js` return 404; `/about/index.md` carries `X-Robots-Tag: noindex`; `/icons/gonzalo-dev.svg` carries the immutable `Cache-Control`; every response carries `Content-Security-Policy`.

---

## 🔧 Environment Configuration

### Frontend
- `VITE_EMAILJS_SERVICE_ID`: EmailJS service identifier; it must start with `service_` (with any other value the form reports that contact is not configured, see `frontend/src/features/contact-form/api/contactApi.ts`).
- `VITE_EMAILJS_TEMPLATE_ID`: EmailJS template identifier.
- `VITE_EMAILJS_PUBLIC_KEY`: EmailJS public key.

Local development: place the three `VITE_EMAILJS_*` variables in `frontend/.env.local` (gitignored; expected keys are documented in `frontend/.env.example`). Vercel keeps the production values in the project dashboard. Nothing reads `VITE_API_BASE_URL` or `PNPM_APPROVE_BUILDS` any more: if they are still in the Vercel dashboard, delete them.

---

## 🛠️ Local Development

### Quick Start
```bash
git config core.hooksPath .githooks
pnpm --dir frontend install
pnpm --dir frontend dev
```

The dev server listens on `localhost` only; run `pnpm --dir frontend dev --host` to open it from a phone on the same network. It also serves `llms.txt`, `robots.txt`, `sitemap.xml` and the markdown twins; the per-route HTML shells (titles, canonical links, JSON-LD) and `404.html` only exist in the build output.

`pnpm --dir frontend install` runs only the dependency install scripts approved in `frontend/pnpm-workspace.yaml` (esbuild); with `--ignore-scripts` nothing runs. Git hooks live in `.githooks/` and are enabled once per clone with `git config core.hooksPath .githooks`.

### Quality Gates
```bash
python verify.py                      # Canonical runner: runs all 9 repository and frontend gates
pnpm --dir frontend run format:check  # Prettier formatting check
pnpm --dir frontend run lint          # ESLint: architecture (FSD) rules + TS rules; any warning fails it
pnpm --dir frontend run typecheck     # TypeScript strict solution check (tsc -b)
pnpm --dir frontend test              # Vitest: unit, content-integrity and architecture-rule tests
pnpm --dir frontend build             # TypeScript compilation + Vite production build
```

`pnpm --dir frontend build` also powers `pnpm --dir frontend preview`, which serves the production bundle locally; open a route's shell at its trailing-slash address (e.g. `/about/`). Git hooks in `.githooks/` check commit messages on `.githooks/commit-msg` (`tools/board/commit_message.py`) and run `python -I verify.py` on `.githooks/pre-push` (`tools/board/pre_push.py`). The architecture rules and what enforces each one are in `docs/ARCHITECTURE.md` and the [Architecture Guide](ARCHITECTURE.md#-feature-sliced-design-rules).

### Loading-state verification

Verified on **2026-10-14**: `pnpm lint`, all 350 tests in 47 files, `pnpm build` and `git diff --check` passed. The final review found no blocking regressions or unnecessary architectural additions. Production-preview checks covered the minimal startup in all three themes, narrow screens, reduced motion, blocked bundles/styles, replacement by React and the no-JS fallback. Gallery checks covered pending/failed images, manual retry, navigation, zoom and keyboard focus, including short landscape screens. Existing skeletons and the project listing remain unchanged. Repeat these browser checks when changing loading behaviour, restoring network and motion overrides afterwards:

- Disable cache and throttle the network, then open a gallery. Confirm a named loading indicator, stable image area, usable navigation/close, and disabled zoom until the selected image loads. Move between images before requests finish and reopen a cached image; an old result must not replace the current state.
- Block a selected `-full.webp` request. Confirm the error text and Retry action; unblock it and retry once. Keep keyboard focus stable through retry/success, and confirm that closing returns focus to the opener. Repeat at narrow widths and with reduced motion.
- Block the application entry bundle and reload a route. The initial HTML must show only the portfolio brand and a named indeterminate indicator, with no visible language-dependent copy. Its CSS rotation continues until React replaces it and is disabled with reduced motion. Also block the app stylesheet to verify the inline presentation. Restore requests and reload: React must replace it without an imposed wait.
- Disable JavaScript on a generated route shell and `404.html`: the startup indicator must disappear and the no-JS text links must work. This fallback is generated by the build, so test with `pnpm preview`, not the dev server. Check all three themes and reduced motion with JavaScript enabled.

Design references checked before implementation:

- [GoogleChrome Modern Web Guidance: spinner](https://github.com/GoogleChrome/modern-web-guidance-src/blob/9fbd1d0805ad8a37481fda4757d9b105d6a09c25/guides/ui-components/spinner/guide.md) supports named native indeterminate progress and efficient CSS motion; this implementation uses a simple border ring and removes motion under reduced motion. [React's `root.render`](https://react.dev/reference/react-dom/client/createRoot#root-render) documents replacement of the initial root content.
- WAI's [carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) and [modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) patterns inform controls, keyboard behaviour and focus; [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) inform announcements without moving focus. The gallery keeps manual navigation and its existing modal layout.
- MUI's [progress](https://mui.com/material-ui/react-progress/) documentation guides the existing component used inside React; its [image-list examples](https://mui.com/material-ui/react-image-list/) describe layout options, not a reason to replace the current project cards. [MDN's image completion reference](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/complete) explains why `complete` alone cannot distinguish a cached success from a broken image.

---

## 🧠 Content Management

There is no CMS and no admin panel. All content is **static JSON + self-hosted images**, edited directly in the repo. Every push to `main` deploys automatically via Vercel.

Paths in this section are relative to `frontend/`.

### 1. Edit content

Content lives in `src/entities/<entity>/api/data.json`:

| Content | File | Notes |
|---|---|---|
| Profile | `src/entities/profile/api/data.json` | bilingual fields (`subtitleEn`/`subtitleEs`, …); `alternateName` (the full legal name) only feeds the JSON-LD |
| Projects | `src/entities/project/api/data.json` | sorted by `order` asc; `featured` flag controls the home grid |
| Skills | `src/entities/skill/api/data.json` | sorted by `order` asc; `level` 0–100; `category` is one of `SKILL_CATEGORY_ORDER` (`src/entities/skill/model/categories.ts`, which also sets the order of the groups on the Skills page); a new category also needs a label in `skills.categories` (`src/shared/config/i18n.ts`, EN and ES) and in `tooling/agent-files/labels.ts` — tests enforce all three. *Core Competencies* (About page, its twin and the JSON-LD `knowsAbout`) are the Frontend, Backend, Database, Mobile and Desktop skills with `level` ≥ 70 (`getCoreSkills`) |
| Experience | `src/entities/experience/api/data.json` | sorted by `endDate DESC` (open-ended first), then `startDate DESC`; omit `endDate` for current roles; dates are `YYYY-MM-DD` and are shown as month and year (`Mar 2025 – Jun 2025`) |
| Spoken languages | `src/entities/spoken-language/api/data.json` | sorted by `order` asc |

**Add a project:** append an object to the projects array with `id` (slug), bilingual texts, `technologies`, `images`, `links`, `type`, `featured`, and the next `order` value. To place a project elsewhere, insert it at that position and renumber the `order` of the entries after it: the array must stay sorted by `order`.

- `images` is the gallery in order; the first one is the card cover. Each entry is `{ "base": "/images/projects/<slug>/<NN>-<name>", "fullWidth": <width of the -full file in px>, "altEn": "…", "altEs": "…" }`, where `<NN>` is its gallery position (`00`, `01`, …) and the alt texts describe what the screenshot shows (at most 250 characters; the gallery also shows them as captions). The tests check that the three variants exist (see below) and that `fullWidth` matches the file.
- `links` is the list of card buttons, in order: `{ "kind": "site" | "download" | "googlePlay" | "repository" | "documentation", "url": "https://…" }`. `site`, `download` and `googlePlay` are primary (filled buttons; `llms.txt` uses the first primary link); `repository` and `documentation` are secondary. Leave out a private repository rather than linking a page visitors cannot open, and say in the description that the source code is private.
- **New kind of link** (e.g. an App Store button): add it to `PROJECT_LINK_KINDS` in `src/entities/project/model/projectLinks.ts` (label key and emphasis), its label under `projects.links` in `src/shared/config/i18n.ts` (EN and ES, sentence case in Spanish), its twin label in `tooling/agent-files/labels.ts` and its icon in `LINK_ICONS` (`src/entities/project/ui/ProjectCard.tsx`). TypeScript and `labels.test.ts` fail until all four exist; the card logic does not change.

**Card description:** the card shows the first paragraph and a *Read more* button for the rest, so the first paragraph should say on its own what the project is and what it is built with.

**Rich text:** descriptions can store line breaks as literal `\n` sequences and lists as lines starting with `●` (also `•`, `*`, `◦`, `▪`, `-`). A `●`, `•`, `◦` or `▪` in the middle of a line starts a new bullet; `-` and `*` only count at the start of a line, so "Frontend - React" stays one sentence. `src/shared/lib/richText.ts` normalizes both conventions for the UI and the generated markdown twins.

**Open to work badge:** the Home hero and the Experience page, and their markdown twins, show *Open to work* / *Disponible para trabajar* (`common.openToWork` in `src/shared/config/i18n.ts`, `openToWork` in `tooling/agent-files/labels.ts`). `StatusBadge` keeps its green success colour on an opaque surface in all three themes. It is not a data field: to stop showing it, remove the `StatusBadge` from `src/pages/home/ui/HomePage.tsx` and `src/pages/experience/ui/ExperiencePage.tsx` and the `openToWorkLine` calls from `tooling/agent-files/twins.ts`, then update `twins.test.ts`.

**Animations:** the theme menu can pause or resume the availability dot and the floating Home card together. The choice is saved for later visits; if site storage is blocked, it still works for the current session. The system's reduced-motion preference takes priority and is explained in the menu. Glass keeps a static ambient background; pausing affects only the small decorative animations.

**Localized links:** Spanish pages live at the root URLs (`/`, `/about`, …) and English pages have dedicated `/en` URLs (`/en`, `/en/about`, …), each with their own localized HTML shells and Open Graph metadata, and switching the language updates the address bar automatically. Adding `?lang=es` (or `?lang=en`) to any page address is also supported as an explicit override: the visitor's language choice is saved as if they had picked it in the menu, and the URL is normalized to the matching localized route without the query parameter.

### 2. Add images

Every project image ships in **three WebP variants** (quality 82) under `public/images/projects/<slug>/`, all sharing the `base` name recorded in `data.json`:
- `<name>-thumb.webp` — 160 px wide, used by the gallery thumbnail strip
- `<name>-800.webp` — 800 px wide, used by the project card cover
- `<name>-full.webp` — original size, used by the fullscreen gallery and, on high-density screens, by the card cover (`srcset`)

Generate them with `ffmpeg` built with libwebp (nothing is downloaded), naming the output after the gallery position and the content:

```bash
cd frontend
src=path/to/capture.png                                  # your own source image
out=public/images/projects/<slug>/NN-<slug>_<description>
ffmpeg -i "$src" -vf "scale='min(160,iw)':-2:flags=lanczos" -c:v libwebp -quality 82 "$out-thumb.webp"
ffmpeg -i "$src" -vf "scale='min(800,iw)':-2:flags=lanczos" -c:v libwebp -quality 82 "$out-800.webp"
ffmpeg -i "$src" -c:v libwebp -quality 82 "$out-full.webp"
```

Never upscale: `min(…, iw)` keeps a narrower source at its own width, so a source 800 px wide or narrower gives an `-800` file the size of the `-full` one (the tests check the width of every variant against `fullWidth`). Record the width of the `-full` file as `fullWidth`.

- **Covers and gallery content:** the card shows the cover at 16:9 (`PROJECT_COVER_RATIO`) and the tests require exactly that ratio in all three variants. Crop a real screenshot to its content, or extend it with rows of its own plain background when it is too short; never put browser chrome in a screenshot. Gallery slides show the product or its functionality; do not add slides containing only a logo, including as the cover.
- **No leftovers:** the tests fail on any file under `public/images/projects/` that no project shows, so delete the old variants when you replace or remove an image.
- **Other images:** WebP only (quality 82 for screenshots, 85 for the profile photo), no external image hosts. The profile photo lives in `public/images/profile/` and its fallback is `public/profile-fallback.webp`.
- **Social preview:** `public/og-cover-typographic.jpg` (1200×630 JPEG, quality 85; social crawlers reject WebP): the GONZALO.DEV wordmark, name, role and main stack in Inter on the dark hero gradient, no photo, rendered from an HTML page in headless Edge. `index.html` links it from `og:image` and `twitter:image` by a root-relative path (the build makes it absolute) and describes it in `og:image:alt` and `twitter:image:alt`. Social platforms cache previews by URL, so a changed image gets a new file name; after the deploy, refresh the previews with LinkedIn Post Inspector and the Facebook Sharing Debugger.
- **Icons:** the GONZALO.DEV monogram in `public/icons/`: `gonzalo-dev.svg` (preferred by browsers), `gonzalo-dev.ico` (16, 32 and 48 px) and `gonzalo-dev-180.png` (apple-touch icon). A changed icon gets new file names and new links in `index.html`; `pnpm test` checks that every icon and social image `index.html` links exists.

**Cache immutability:** Vercel serves `/assets/*`, `/images/*` and `/icons/*` with a 1-year immutable `Cache-Control`. Vite hashes JS/CSS filenames, so they refresh on every build; image and icon filenames do not. If you replace an image's content, **rename the file** (keep its numeric prefix, which is the gallery position, and change the descriptive part, e.g. `02-gonzaloapps-site_quotidia` → `02-gonzaloapps-site_quotidia-gallery`; rename the `-thumb`, `-800` and `-full` variants together so they keep one base name) and update `base` in `data.json`, or returning visitors will keep the old image for up to one year. `index.html` is always revalidated, so new deployments are picked up immediately.

### 3. Verify

```bash
cd frontend
pnpm test    # data-integrity tests FAIL if an image variant is missing, has the wrong width or is unused, a cover is not 16:9, an alt text or link is invalid, or fields/orderings break
pnpm lint
pnpm build
```

### 4. Ship

Before shipping a visual change, preview the production build and check the theme menu, keyboard navigation, image gallery, and the availability badge on Home and Experience at desktop and narrow widths. Check both the saved animation pause and the system's reduced-motion setting. No test message needs to be sent to EmailJS; its deadline and failure paths are covered with a mocked SDK.

The local interaction review on **2026-10-14** compared deployed commit `11e861c` with the corrective production build, on the same machine in Brave at 2550×1215, DPR 1, with the tab in the foreground. Four-second `requestAnimationFrame` samples measured steady rendering cadence; the final build kept both the dot and card animations running. Event Timing measured opening and closing the theme menu.

| Observation | Before | Corrective build |
|---|---|---|
| Mean frame interval | 74–81 ms | 5.94 ms |
| Theme-menu click duration | 288–296 ms | 32–40 ms |
| Elements with backdrop blur on Home (including offscreen) | 44 | 6 |

These are local diagnostic samples, not field Core Web Vitals or a guarantee for every device. The main cause was the oversized moving background behind the glass surfaces. The replacement stays within the viewport and remains static; the two small animations can be paused independently of the theme. No new dependency was added. The review also corrected the contact deadline and editing state, active navigation for trailing-slash URLs, prefetch failure handling, social-icon hover contrast and inaccurate project copy. The FSD boundaries and existing lint enforcement needed no redesign.

Review closure: `pnpm lint`, all 334 tests in 45 files, `pnpm build` and `git diff --check` passed. Browser checks covered the three badge themes, Home/Experience, 320 px and 390 px layouts, gallery controls and focus return, form validation, saved pause/resume and live reduced-motion changes. The disabled motion explanation remains reachable with the menu's keyboard navigation. No production deployment was performed as part of this review.

Commit and push to `main` → Vercel deploys automatically; GitHub Actions reports lint, tests and the type-checked production build alongside it (it does not hold the deploy back).

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
