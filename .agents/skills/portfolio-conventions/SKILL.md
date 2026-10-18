---
name: portfolio-conventions
description: Project conventions of the static bilingual portfolio (stack, static JSON content model, images, project links and cards, routing, state, i18n, skill categories, theming, accessibility, testing, build and deploy, agent-readable output, security). Use before changing code, content, tests or build tooling in frontend/, together with the architecture in ARCHITECTURE.md.
---

# portfolio-conventions

## Purpose

This skill documents project-specific decisions for the Portfolio application. The architecture of `src` (layers, slices, imports, styles, data and network, and what enforces each rule) is not repeated here: it lives in `ARCHITECTURE.md` → *Feature-Sliced Design Rules* at the repository root, and the `react-fsd-maintainer` skill holds the procedures that apply it. Load this skill alongside them when working on this project.

## Stack

| Category | Choice |
|---|---|
| UI Library | MUI (Material UI) |
| Routing | React Router DOM |
| State (UI) | React Context API |
| Forms | plain controlled components |
| i18n | i18next + react-i18next |
| Email | EmailJS |
| Testing | Vitest + Testing Library |
| CSS | MUI `sx` prop + Emotion + CSS co-located in `ui/` |
| Typography | Inter Variable via `@fontsource-variable/inter`, latin subset preloaded by the build; no external font CDNs |

Versions live in `frontend/package.json`; do not duplicate them in documentation.

## Architecture (static content)

The portfolio is a **fully static frontend**. There is no backend, no HTTP client, and no server state.

- All business content lives in **static JSON files** co-located in the `api/` segment of each entity slice:
  - `entities/project/api/data.json`
  - `entities/profile/api/data.json`
  - `entities/skill/api/data.json`
  - `entities/experience/api/data.json`
  - `entities/spoken-language/api/data.json`
- The `api/` segment is the **data access layer**: the `*.ts` files in `api/` import the JSON and expose plain synchronous getters (`getAllProjects()`, `getFeaturedProjects()`, `getProfile()`, `getSkillGroups()`, `getCoreSkills()`, `getAllExperiences()`, `getAllSpokenLanguages()`). A slice's `index.ts` exports only the getters other layers use (`getAllSkills()` stays internal to the skill slice).
- Content is **bilingual by design**: every translatable text field is an En/Es pair (`titleEn`/`titleEs`). Technologies, skill categories (translated through i18n), URLs, `logoText` and `alternateName` hold a single value. Language switch only re-renders.
- Adding/editing content = **editing JSON** (data change, not code change). No CMS, no admin panel.
- Data integrity is enforced by co-located tests (`entities/<entity>/api/data.test.ts`): they validate the field contract, ordering, that every referenced image exists in `public/images/`, and that no project image ships unused.
- All images are **self-hosted** in `frontend/public/`: content images under `images/` (project folders, `profile/`, `no-image.svg`), icons under `icons/`, the social preview and the profile fallback at the root. External image hosts are forbidden (enforced by data-integrity tests and by the CSP's `img-src 'self'`).

## Image Strategy

- **Format:** WebP (Baseline widely available), quality 82 for project screenshots, 85 for the profile photo. No PNG/JPEG payloads in the bundle, except the social preview JPEG (social crawlers reject WebP) and the icons.
- **Project image model:** `Project.images` is an ordered list of `ProjectImage` objects (`base`, `fullWidth`, `altEn`, `altEs`); the first one is the card cover. Never reintroduce parallel URL arrays. Variant URLs are derived from `base` only through `projectImageUrl(image, variant)` and the cover sources only through `projectCoverSources(project)` (`entities/project/model/projectImages.ts`); do not build `-800`/`-full`/`-thumb` paths by hand.
- **Covers and gallery content:** the card shows its cover at `PROJECT_COVER_RATIO` (16:9) and crops anything else, so every cover is composed at exactly that ratio: a real product screenshot cropped to its content, or extended with rows of the screenshot's own plain background when it is too short. Never upscale or put browser chrome in a screenshot. Gallery slides show the product or its functionality; do not add slides containing only a logo, including as the cover. `data.test.ts` checks the cover ratio of all three variants.
- **Three variants per project image**, all sharing `base`:
  - `<base>-thumb.webp` — 160 px wide, gallery thumbnail strip
  - `<base>-800.webp` — 800 px wide, card cover
  - `<base>-full.webp` — original size, fullscreen gallery; also the high-density candidate of the cover `srcset` when `fullWidth` > 800 (never offer a `w` descriptor larger than the file)
- **Alt texts:** every project image carries `altEn`/`altEs` describing what the screenshot shows (≤ 250 characters, EN and ES different, strictly parallel in meaning). Write them by looking at the image; the gallery shows the alt under the image as a caption, and the cover uses the first image's alt.
- **Social preview:** `public/og-cover-typographic.jpg` (1200×630 JPEG, quality 85): the GONZALO.DEV wordmark, name, role and main stack in Inter on the dark theme's hero gradient, no photo, at least 64 px from every edge, with name and role inside the central 630×630 square for previews that crop it square. It is rendered from an HTML page in headless Edge. `index.html` references it from `og:image` and `twitter:image` by a root-relative path; the build makes both absolute (`SITE_URL`) and refuses any other form. `og:image:alt` and `twitter:image:alt` carry the same text and describe what the image shows. Social platforms cache previews by URL, so a changed image gets a new file name.
- **Icons:** `frontend/public/icons/` holds the GONZALO.DEV monogram (a white "G" and a `90caf9` dot on the hero gradient): `gonzalo-dev.svg` (preferred), `gonzalo-dev.ico` (16, 32 and 48 px; linked with `sizes="32x32"` so browsers still pick the SVG) and `gonzalo-dev-180.png` (opaque, full-bleed apple-touch icon). The icon is the portfolio's own; never reuse another product's icon. `frontend/tooling/hosting/vercelConfig.test.ts` checks that every icon and social image `frontend/index.html` links exists in `frontend/public/`.
- **Fallbacks:** `frontend/public/images/no-image.svg` (project), `frontend/public/profile-fallback.webp` (profile). Both local; `ImageWithFallback` picks one by its required `type`.
- **Gallery image states:** `ProjectGallery` owns the current image's loading, loaded and error states, keyed by source and explicit retry attempt. It uses the browser's image events and checks both `complete` and natural dimensions for cached images. Pending/error states keep close and image navigation available, disable zoom, and announce their status; retry remounts only the selected image, never runs automatically, and preserves keyboard focus. These are local image-resource states, not asynchronous project-data state or an HTTP client.
- **No layout shift (CLS):** `ImageWithFallback` requires `aspectRatio` (project covers `PROJECT_COVER_RATIO`, profile photo `2/3`) so the container reserves space while the image loads.
- **Lazy loading:** `loading="lazy"` on below-the-fold images only. The LCP image of a route that shows one above the fold is rendered with `loading="eager"` + `fetchpriority="high"` and preloaded by the route shell with the exact same sources through `RouteSpec.lcpImage` (`frontend/tooling/agent-files/routes.ts`, asserted in `frontend/tooling/agent-files/shell.test.ts`): the first project cover on `/projects` (`ProjectCard` `priority`) and the profile photo on `/about`. Home featured cards and the Home profile photo sit below the hero and stay lazy. Never combine `fetchpriority` with `loading="lazy"`.
- When adding/replacing images: generate the three WebP variants with ffmpeg + libwebp at q82 (`scale='min(160,iw)':-2`, `scale='min(800,iw)':-2` and full size; the exact commands are in `OPERATIONS.md` → *Add images*), record `fullWidth` and both alt texts in `data.json`, and run `pnpm --dir frontend test` (integrity tests check that every variant exists on disk with the width `fullWidth` implies). **Never upscale:** when the source is 800 px wide or narrower, the `-800` variant has the size of the `-full` one (same rule for `-thumb` below 160 px); `min(…, iw)` guarantees it. Do not document or run `npx` image tools: ffmpeg downloads nothing.
- **Cache immutability:** Vercel serves `/assets/*`, `/images/*` and `/icons/*` immutable for 1 year (`frontend/vercel.json`). Vite hashes JS/CSS filenames, so they refresh every build; image filenames do not. When replacing an image's content, **rename the file**: keep the numeric prefix (it is the gallery position), change the descriptive part, and rename the `-thumb`, `-800` and `-full` variants together so they keep one base name; then update `base` in `data.json`. A changed icon likewise gets new file names in `frontend/public/icons/` and new links in `frontend/index.html`. `frontend/index.html` stays `max-age=0, must-revalidate` so deployments are picked up immediately.

## Project Links and Cards

- `Project.links` is an ordered list of `ProjectLink` (`{ kind, url }`); never add per-link fields such as `githubUrl`/`liveUrl` back to `Project`.
- `PROJECT_LINK_KINDS` (`frontend/src/entities/project/model/projectLinks.ts`) is the single registry of link kinds: each entry holds its i18n label key and its emphasis (`primary` = filled button, `secondary` = text button). The icon lives in `LINK_ICONS` (`ProjectCard.tsx`), because icons are UI.
- Adding a kind = one registry entry + its `projects.links.<kind>` label in `frontend/src/shared/config/i18n.ts` (EN and ES) + its twin label in `frontend/tooling/agent-files/labels.ts` (`links.<kind>`) + its icon. Card, twin and llms.txt logic never branch on a kind. `frontend/tooling/agent-files/labels.test.ts` enforces the label parity; the `Record<ProjectLinkKind, …>` types enforce the icon and twin label.
- Twins list every link with the registry labels in data order; llms.txt links the title to the first primary link and appends the others.
- Project data tests require registered kinds, `https` URLs and no repeated URL within a project.
- Cards show the first paragraph of the description (`splitDescription`) and reveal the rest with a *Read more* button (`aria-expanded`, `aria-controls`); the collapsed part stays findable with `hidden="until-found"` (`useFindableDisclosure`). Never put a fixed-height scroll box inside a card.
- Card action buttons and the Read more button carry `aria-describedby` pointing at the card title, so repeated labels ("Visit Site") keep their context for assistive technology.
- The card title is an `h3` under a section heading (Home) and an `h2` when the cards sit right under the page `h1` (`/projects` passes `titleComponent="h2"`).

## Routing

- **Library**: React Router DOM (version in `frontend/package.json`)
- **Single route list**: `APP_ROUTES` (`frontend/src/shared/config/routes.ts`, `{ id, path }` in menu order). The router (`frontend/src/app/routing/AppRouter.tsx`), both navigation menus and the build-time route shells (`frontend/tooling/agent-files/routes.ts`, whose `SHELLS` is a `Record<RouteId, …>`) derive from it. Adding a page = one `APP_ROUTES` entry + its `nav.<id>` label + its loader and skeleton in `AppRouter` + its shell; TypeScript flags every missing piece.
- **Pattern**: `React.lazy()` for all page components (code-splitting); each page loader is declared once in `PAGE_LOADERS` and reused by the idle prefetch. A failed prefetch emits a structured `page-prefetch-failed` warning with its route and error, leaving the current page usable; an actual navigation load failure still reaches the error boundary. Page slices export only their default component.
- **Layouts**: all pages wrapped in `PublicLayout` (Navbar + Footer + Outlet)
- **Fallback**: `<Suspense>` with page-specific skeleton loaders
- **Route changes**: `useRouteChangeFocus` (`frontend/src/app/layouts/lib/`) scrolls a new page to the top and moves the focus to `<main id="main-content">`, except on back/forward (the browser restores those) and hash-only changes (skip link, return to top).
- **Canonical links**: `useCanonicalLinks` (`frontend/src/app/layouts/lib/`, called once in `PublicLayout`) points the canonical link, `og:url` and both markdown alternates at the current page after every client-side navigation; it only updates tags the route shell has (the dev server and 404.html have none).
- Routes: home (/), `/about`, `/skills`, `/experience`, `/projects`, `/contact`. Any other address is a real 404: Vercel serves 404.html (status 404, `noindex`), whose app sends the visitor home through the router's catch-all (`*` → home). Never add a catch-all rewrite to `frontend/vercel.json`: it answers missing assets and images with the home page and status 200.

## State Management

- **No global server state** and **no Zustand**. Content is read synchronously via the entity getters.
- **React Context** is used for cross-cutting UI state only:
  - **Theme** (`frontend/src/features/theme-switch/`): `ColorMode` = `light | dark | glass` (`COLOR_MODES` in `frontend/src/shared/config/theme.ts`). Until the visitor picks one, the theme follows the operating system (`prefers-color-scheme`, live); only an explicit choice (`setColorMode`) is saved to `localStorage: themeMode`. MUI `ThemeProvider` wraps the app with the single `CssBaseline` (`enableColorScheme`, so scrollbars and form controls follow the theme).
  - **Language** (`frontend/src/features/language-switch/`): `Language` = `en | es` (`SUPPORTED_LANGUAGES` in `frontend/src/shared/config/language.ts`). Only an explicit choice (`setLanguage`) or a `?lang=` link is saved to `localStorage: language`; the provider then drops the `lang` parameter from the address. i18next `changeLanguage` and `<html lang>` follow the context.
  - **Notifications** (`frontend/src/features/notifications/`): MUI Snackbar + Alert for form feedback. The notifier signature is `ShowNotification`, with its `NotificationSeverity` (`frontend/src/shared/lib`, free of MUI); the provider passes the severity to the Alert as is.
- **Storage**: never touch `localStorage` directly. Use `readStorage`/`writeStorage` (`frontend/src/shared/lib/storage.ts`): browsers that block site data throw on any access, and a preference must never blank the page. Validate what you read (only known modes and languages).

## Content Fetching Pattern

Pages read content synchronously through the `useContent` hook (`frontend/src/shared/lib/useContent.ts`):

```tsx
import { useContent } from '@/shared/lib';

const { data: projects } = useContent(() => getAllProjects());
```

### Contract

- `data: T` — always defined (content is part of the bundle)
- No `loading`, no `error`, no `refetch`: there is nothing to fetch, cache, or retry

This contract concerns the bundled entity data. Route-module skeletons and gallery image-resource states belong to their existing UI consumers and do not change `useContent`.

## i18n

- **Languages**: English (`en`), Spanish (`es`)
- **Detection** (`resolveInitialLanguage`, before the first render): `?lang=es|en` → saved choice → `navigator.language` → fallback `en`; anything but `en`/`es` (after dropping the region) is ignored. `?lang=` makes shareable Spanish links; there are no `/es` sub-routes: Spanish is applied in the browser and is not indexable. SEO metadata, canonical URLs and `og:locale` (`en_US`, no `og:locale:alternate`) stay English.
- **Language menu**: options are endonyms (`English`, `Español`) with their `lang` attribute, never translated names.
- **Dates and numbers**: use `formatMonthYear`/`formatPeriod`/`formatPercent` (`frontend/src/shared/lib/localeFormat.ts`) in the UI and the twins alike. Content dates are ISO `YYYY-MM-DD`, formatted in UTC as short month and year (`Mar 2025 – Jun 2025`, `mar 2025 – Actualidad`); Spanish percentages carry a non-breaking space (`80 %`).
- **Translation files**: inline in `frontend/src/shared/config/i18n.ts`. UI strings only; content text lives in the JSON data (En/Es fields).
- Keep `frontend/src/shared/config/i18n.ts` pruned: a key must be reachable from code via `t()`/`i18n.t()`; remove unused keys when touching components.
- Bilingual content fields (En/Es) are resolved with `getLocalizedText(language, en, es)` from `@/shared/lib`. Do not re-implement the En/Es fallback inline.
- Content is never duplicated in `frontend/src/shared/config/i18n.ts`: pages render profile/project/experience text straight from the JSON, with no `|| t(...)` fallback. The entity `data.test.ts` files require both sides of every rendered En/Es pair instead.
- `t()` calls never pass inline default text: use `t('key')` or `t('key', { vars })`. `frontend/src/shared/config/i18n.test.ts` fails when the English and Spanish key sets differ or a static key used in `frontend/src/` is missing in either locale.
- Spanish copy targets Spain (`es_ES`) and uses sentence case for headings, buttons and titles (only the first word and proper nouns capitalised); English UI headings use Title Case. Keep EN and ES strictly parallel in meaning.
- `technologies` arrays (projects, experience) are shown untranslated in both languages, so they hold technology names only, never phrases, with their official casing (`TypeScript`, `Spring Boot`, `Tailwind CSS`, Node.js). A localisation chip is written `i18n (<language codes>)`, e.g. `i18n (EN/ES)`.
- Content values that are single-language keys (skill `category`) are translated through i18n (`skills.categories.<Category>`) and mirrored in the twin labels (`frontend/tooling/agent-files/labels.ts`); `frontend/tooling/agent-files/labels.test.ts` fails if a category of `SKILL_CATEGORY_ORDER` lacks either.
- The *Open to work* / *Disponible para trabajar* badge is UI, not data: `StatusBadge` with `common.openToWork` on the Home hero and the Experience page, mirrored in the matching language in those two twins (`openToWorkLine`, `TWIN_LABELS.openToWork`). Its green success colour and opaque surface remain consistent in light, dark and glass. Showing or hiding it changes those three places and `frontend/tooling/agent-files/twins.test.ts` together.

## Skills

- `SKILL_CATEGORY_ORDER` (`frontend/src/entities/skill/model/categories.ts`) is the closed list of categories and their display order (development stacks first). `getSkillGroups()` groups skills in that order for the Skills page and its twin; the skill data test rejects unknown categories.
- Core competencies (About page and its twin) come only from `getCoreSkills()`: the Frontend, Backend, Database, Mobile and Desktop skills with `level` ≥ `CORE_SKILL_LEVEL` (70). Never filter by level anywhere else.

## Theming

- **Three modes**: `light`, `dark`, `glass` (Liquid Glass aesthetic)
- **Glass mode**: MUI dark base with a static ambient background of radial gradients fixed within the viewport, translucent surfaces, neon colors and text shadows. Backdrop blur is reserved for panels and surfaces (`MuiCard`, `MuiPaper`, `MuiAppBar`), with none on individual chips or buttons. The navbar uses the theme's dark translucent `MuiAppBar` with light text. Contained buttons use a neon tint and turquoise border, outlined buttons use a glass tint, and text buttons stay transparent so the button hierarchy survives.
- **Chip colors**: glass decoration applies only to default-color chips; semantic colors such as success and error keep MUI's palette. Informational chips have no hover animation suggesting an action.
- **Decorative motion**: the availability dot pulses continuously and the Home profile card floats gently. The theme menu has an independent `menuitemcheckbox` to pause both, saved as `localStorage: animationsPaused` through the storage helpers. `ThemeProvider` exposes `--decorative-animation-state` with `GlobalStyles`; consumers use `animation-play-state: var(--decorative-animation-state, paused)` without importing the feature into shared UI. Enable the effects only under `prefers-reduced-motion: no-preference` and disable them in print. The system preference takes priority and the menu explains when it disables motion. Keep the badge text steady; no continuous backdrop animation or JavaScript timers.
- **Theme factory**: `createAppTheme(mode)` in `frontend/src/shared/config/theme.ts`
- **Glass constants**: `glassColors`, `glassEffects` in `frontend/src/shared/config/glassStyles.ts`
- **First paint**: an inline script in `frontend/index.html` applies the saved or system mode's `background.default`, `color-scheme` and `theme-color` before the JavaScript loads (no white flash in dark and glass); `ThemeProvider` removes those inline styles on mount and `CssBaseline` owns the page colours from then on. The script mirrors `ThemeProvider` and `createAppTheme`: `ThemeProvider.test.tsx` runs it for every mode, and the CSP allows it by hash (see Security).
- **Initial loading**: `frontend/index.html` shows only the portfolio brand and an indeterminate native `progress` inside the one app root, with scoped inline CSS. Its accessible name follows the initial document language; no visible copy needs translation before i18next loads. The indicator uses the prepaint colour scheme and continuous CSS rotation, static with reduced motion. React's first render replaces it immediately; existing route-specific Suspense skeletons then handle pending page modules. `noscript` hides the loader and preserves the generated no-JS fallback. This adds no language resolver, bootstrap timer, extra script or artificial delay; it provides startup feedback, not app-bundle error recovery.
- **Neon colors**: turquoise `5DE0E6`, violet `8A6EFF`, pink `FF7B9C`
- **Contrast**: text meets 4.5:1 and outlines 3:1 in all three modes. Text placed on a gradient gets a solid surface (hero *Download CV*, `StatusBadge`); the hero gradient start is chosen per mode (`HERO_GRADIENT_START`); outlined inputs use the stronger `MuiOutlinedInput` border from the theme.

## Accessibility

- Headings follow the outline: one `h1` per page, then `h2`/`h3` without gaps. Set `component` whenever the MUI variant would emit the wrong level (`subtitle1`/`subtitle2` render `h6`, `h5` renders `h5`); plain text such as skill names and companies uses `component="p"`.
- The desktop links and the drawer list each sit in a `<nav aria-label>`; the current page carries `aria-current="page"` (plus an underline or `selected`, not colour alone). The menu button exposes `aria-expanded`/`aria-controls` and the drawer is named.
- The language and theme selectors are menu buttons (`aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, menu labelled by its button, `menuitemradio` + `aria-checked` items). Below `sm` they show only the icon, so their `aria-label` is the name and it contains the visible text (`Language: English (EN)`, `Theme: Dark`).
- The fixed header never covers the focus (`scroll-padding-top` in `frontend/src/app/styles/index.css`). The return-to-top link appears after scrolling (`.visible`) and is always reachable by keyboard.
- Forms validate in the site language (`noValidate` + translated `helperText`, focus on the first invalid field), declare `autoComplete` for personal data, and mark the busy submit button with `aria-disabled` (never `disabled`, which drops the focus). While sending, fields are `readOnly` to preserve focus and prevent new edits from being cleared by the response; they become editable again on success or failure.
- Print ("Save as PDF") renders black text on white without the header in every theme (`@media print` in `frontend/src/app/styles/index.css`).

## Testing

- **Framework**: Vitest + @testing-library/react (versions in `frontend/package.json`)
- **Environment**: jsdom
- **Mocks**: `vi.mock` at module level, `vi.fn()` for spies
- **Conventions**: tests next to what they test (`docs/ARCHITECTURE.md`), `describe`/`it` blocks, mocks before imports
- **Real MUI**: MUI renders in jsdom, so there is no global MUI mock; component tests render the real providers they need (`MemoryRouter`, `LanguageProvider`, `ThemeProvider`) and query by role and accessible name. Assertions use plain DOM APIs (`getAttribute`, `textContent`); jest-dom is not a dependency. jsdom has no `matchMedia` or `scrollTo`: stub them per test (`vi.stubGlobal`, `vi.spyOn`).
- **Content integrity tests**: `frontend/src/entities/<entity>/api/data.test.ts` validate the static JSON (contract, ordering, images exist via `import.meta.glob`).
- **Run**: `pnpm --dir frontend test`
- **Every test runs, and the architecture rules are tested**: see `docs/ARCHITECTURE.md`.
- **Local gates**: `.githooks/commit-msg` checks commit messages and `.githooks/pre-push` runs `python verify.py` across all 9 repository and frontend gates before publishing.

## Build & Deploy

- **Build**: `tsc -b && vite build`. `frontend/tsconfig.json` is a solution file: `tsc -b` type-checks `frontend/tsconfig.app.json` (`frontend/src` and `frontend/tooling`, browser libs) and `frontend/tsconfig.node.json` (the configuration files at `frontend/` that its `include` lists, Node libs).
- **Chunks** (`build.rolldownOptions.output.codeSplitting`): `react-vendor` (react, react-dom, scheduler, react-router, react-router-dom) and `mui-vendor` (only the `@mui/*` and `@emotion/*` modules of the first render, `tags: ['$initial']`); MUI components used by a single page (Timeline, TextField, Dialog) stay in that page's chunk. Do not go back to `manualChunks`: Rolldown deprecates it and it pulled React into `mui-vendor`.
- **TypeScript side-by-side layout**: `typescript` is aliased to `@typescript/typescript6` — the programmatic API that typescript-eslint consumes, exposing `tsc6` — while `@typescript/native` provides the native compiler that `tsc` (and therefore `pnpm --dir frontend build`) resolves to. Do not collapse them into a single `typescript` dependency until typescript-eslint supports the native compiler API.
- **Dev**: Vite dev server on `localhost:5173` (`pnpm --dir frontend dev --host` to open it from a phone on the LAN); no API proxy needed. It serves the agent files but not the route shells: check shell metadata with `pnpm --dir frontend build && pnpm --dir frontend preview` at the trailing-slash address (`/about`).
- **Prod**: Vercel (root dir `frontend/`) with no rewrites: every route is a file of its own and any other address gets 404.html; no `/api` proxy. Verification runs locally through `.githooks/pre-push`; there are no GitHub Actions workflows.
- **Line endings**: `.gitattributes` keeps LF in every checkout (`* text=auto eol=lf`); the CSP hash of the inline script depends on it.

## Agent-Readable Output

- `frontend/tooling/agent-files/` generates llms.txt, robots.txt, sitemap.xml, one English and one Spanish markdown twin per route, one HTML shell per route, the home page included (own title, description, `og:*`, canonical, markdown alternates with `hreflang="en"`/`"es"`, JSON-LD and a `<noscript>` fallback that links the twins), and 404.html (`noindex`, no canonical).
- Every shell is built from the built `frontend/index.html` (`buildRouteShell`): the title, description and Open Graph texts come from `frontend/tooling/agent-files/routes.ts`, so the values in `frontend/index.html` only serve the dev server. Do not bring back `<meta name="title">` or `og:locale:alternate`.
- The shells carry metadata, temporary startup UI inside the app root and the `<noscript>` text, not pre-rendered page content: readers without JavaScript get the content from the twins, never claim otherwise.
- It runs as a Vite plugin (`frontend/tooling/agent-files/vitePlugin.ts`, wired in `frontend/vite.config.ts`): `pnpm --dir frontend build` emits everything into `frontend/dist/`; `pnpm --dir frontend dev` serves llms.txt, robots.txt, sitemap.xml and the twins from middleware, while the shells and 404.html exist only in the build output. **Nothing generated is committed to git.**
- Content comes from the entity getters and `frontend/src/shared/lib/richText.ts`; shell metadata mirrors `seo.*` in `frontend/src/shared/config/i18n.ts` and twin labels mirror UI strings. Tests enforce both parities, link integrity across generated files, deterministic output, the real width and height declared for the social image, and that the Vite plugin is wired in `frontend/vite.config.ts` for both the production build and the dev server middleware.
- The site address is `SITE_URL`/`absoluteUrl` (`frontend/src/shared/config/site.ts`) and twin file names come from `markdownTwinPath` (`frontend/src/shared/config/routes.ts`), shared by the build and `useCanonicalLinks`. The route shells live in `frontend/tooling/agent-files/routes.ts`; `ROUTES` is derived from `APP_ROUTES`, so a new page cannot be missing its shell (the `SHELLS` record is keyed by `RouteId`).
- `frontend/src/shared/lib/richText.ts` is the single ruleset shared by `RichTextRenderer` and the twins: `normalizeRichText` for line breaks and `parseBulletLine` for bullet lines (`●•◦▪` anywhere, `-`/`*` only at the start of a line). Change it only in both consumers' interest.
- Twins format dates, percentages, skill groups and core competencies with the same helpers as the pages (`frontend/src/shared/lib/localeFormat.ts`, `getSkillGroups`, `getCoreSkills`), so page and twin never disagree.
- Every twin ends with `## Pages` (links to the other twins in its language) and never skips a heading level: project and experience entries are `##` on their pages, featured projects `###` under Home's `## Featured Projects`.
- Structured data is one `@graph` on every shell: `WebSite` (/#website) and `Person` (/#person, with `knowsAbout` = `getCoreSkills()`, `knowsLanguage` from the spoken languages and `homeLocation`). Derive every value from the data; never hand-write it.
- The markdown twins are served with `X-Robots-Tag: noindex` (`frontend/vercel.json`): agents read them, search engines index the HTML pages. sitemap.xml has no `<lastmod>` on purpose: builds run on shallow clones, where git dates are wrong, and a wrong date is worse than none.
- `frontend/tooling/font-preload/` (build only) adds `<link rel="preload" as="font" crossorigin>` for Inter's latin file to `frontend/index.html` before the shells are copied, so every page inherits it; the build fails if the file is missing.

## Security

- **Scripts**: esbuild's build script is approved in-repo by `allowBuilds: { esbuild: true }` in `frontend/pnpm-workspace.yaml`, the only build-approval setting pnpm 11+ reads; every other dependency's install script stays blocked. Never add a package there without reviewing its install scripts. No environment variable is involved (`PNPM_APPROVE_BUILDS` is not a pnpm setting).
- **Contact form**: EmailJS in the browser (keys are public by design); no secrets stored in the repo. The network call lives in `features/contact-form/api/contactApi.ts`: the SDK is imported on submit (it touches `localStorage` while loading, which throws when site data is blocked) and sends with `blockHeadless` and a 10 s `limitRate`. One 15 s deadline measured with a monotonic clock covers both SDK loading and sending; expiration raises `ContactTimeoutError`, and a late SDK load cannot start a send. A send already in progress may still arrive, so the visitor is told not to resend. Fields are trimmed and validated before sending (`model/validation.ts`); form state, the single-flight guard and notifications live in `features/contact-form/model/useContactForm.ts`. Every failure message offers the owner's email.
- **Content-Security-Policy** (`vercel.json`, every response): `default-src 'self'`; `script-src 'self'` plus the `sha256` of the pre-paint script in `index.html`; `style-src 'self' 'unsafe-inline'` (Emotion injects styles); `img-src 'self'` and `font-src 'self'` (no `data:` URLs, no external hosts); `connect-src 'self' https://api.emailjs.com`; `object-src 'none'`; `base-uri`/`form-action 'self'`; `frame-ancestors 'none'`. JSON-LD blocks are data, not scripts, and need no hash. Editing that inline script changes its hash: `tooling/hosting/vercelConfig.test.ts` fails and prints the value to put in the policy. Add a host only when the built site needs it.
- No authentication surface exists in this app

## File Organization (FSD)

The layers, slices, imports and their enforcement live in `ARCHITECTURE.md` → *Feature-Sliced Design Rules*, this repository's two deliberate decisions included.

## Peer Skills

- `react-fsd-maintainer`: procedures to create a slice, move code down a layer and fix an architecture finding of the lint; the rules themselves are in `ARCHITECTURE.md`.
