import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import fsd from 'eslint-plugin-fsd-lint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import fsdGaps from './eslint-fsd-gaps.js'

// The layers of Feature-Sliced Design, the only folders src/ holds, from the top down.
const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared']
// The layers split into slices, each entered through its index.ts only.
const SLICED_LAYERS = ['pages', 'widgets', 'features', 'entities']
// src/ and its alias, which tsconfig.app.json alone declares ("@/*": ["./src/*"]). It is read as JSON,
// so a comment in it stops the lint here.
const SRC = fileURLToPath(new URL('src', import.meta.url))
const { paths } = JSON.parse(readFileSync(new URL('tsconfig.app.json', import.meta.url), 'utf8')).compilerOptions
const SRC_ALIAS = Object.keys(paths)
  .find((alias) => paths[alias].includes('./src/*'))
  ?.replace('*', '')
// fsd-lint reads '@' as its alias by default, so a scoped package like '@app/tokens' would
// be taken for the app layer: with the slash, only '@/...', what tsconfig.app.json declares,
// is the alias and everything else is a package.
const FSD_ALIAS = { value: SRC_ALIAS.replace(/\/$/, ''), withSlash: true }
// Feature-Sliced Design governs the application in src/ only: tooling/ and the
// configuration at the root are not application code (ARCHITECTURE.md).
const SOURCES = 'src/**/*.{ts,tsx}'
// The segments that hold logic and no UI.
const LOGIC_SEGMENTS = 'src/**/{model,api,lib}/**'
const TESTS = '**/*.test.{ts,tsx}'
// Code src/ may not hold: every rule of this file reads .ts and .tsx files only.
const OTHER_CODE = 'src/**/*.{js,jsx,mjs,cjs,mts,cts}'

const NO_UI_IN_LOGIC =
  'model, api and lib hold logic: a component, its styles and what renders it live in the ui segment.'
const NO_OWN_REQUESTS =
  'src/ sends no request of its own: the only network call is the EmailJS SDK in features/contact-form/api, and a new one is an owner decision (the CSP connect-src allows only the site itself and https://api.emailjs.com).'
const EVERY_TEST_RUNS =
  'a test that does not run checks nothing: make it pass or delete it; an exception is decided in eslint.config.js.'

// What a logic segment may not import, statically or dynamically: a ui segment,
// any entry of react-dom, the JSX runtimes, this site's UI kit and its styling
// (MUI and Emotion, as a whole: ARCHITECTURE.md, Styles) and stylesheets.
const UI_MODULES = [
  '(^|/)ui(/|$)',
  '^react-dom(/|$)',
  '^react/jsx(-dev)?-runtime$',
  '^@(mui|emotion)/',
  String.raw`\.(css|scss|sass|less|styl|stylus|pcss|postcss|sss)(\?.*)?$`,
]
// no-restricted-imports reads static imports only: a dynamic import of the same
// modules is matched as syntax. A selector's regex escapes its slashes.
function dynamicImportOf(modules, message) {
  const source = modules
    .map((module) => `(${module})`)
    .join('|')
    .replaceAll('/', String.raw`\/`)
  return { selector: `ImportExpression[source.value=/${source}/]`, message }
}
// A dynamic import of React brings it as a whole, as a default or namespace import would.
const NO_UI_DYNAMIC_IMPORT = dynamicImportOf([...UI_MODULES, '^react$'], NO_UI_IN_LOGIC)

export default defineConfig([
  globalIgnores(['dist', 'reports']),
  // A comment cannot switch a rule off: an exception lives in this file, next to its decision.
  { linterOptions: { noInlineConfig: true } },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: [SOURCES],
    plugins: { fsd },
    rules: {
      'fsd/forbidden-imports': ['error', { alias: FSD_ALIAS }],
      'fsd/no-cross-slice-dependency': ['error', { alias: FSD_ALIAS }],
      'fsd/no-relative-imports': ['error', { alias: FSD_ALIAS }],
      'fsd/no-public-api-sidestep': [
        'error',
        { alias: FSD_ALIAS, layers: SLICED_LAYERS, publicApi: { allowSegmentImports: false } },
      ],
    },
  },
  {
    // fsd-lint 1.2.1 reads no re-export (export … from), and fsd/forbidden-imports no dynamic import():
    // the local rule holds the same boundaries over them (eslint-fsd-gaps.js).
    files: [SOURCES],
    ignores: [TESTS],
    plugins: { 'fsd-gaps': fsdGaps },
    rules: {
      'fsd-gaps/boundaries': ['error', { root: SRC, alias: SRC_ALIAS, layers: LAYERS, slicedLayers: SLICED_LAYERS }],
    },
  },
  {
    files: [`${LOGIC_SEGMENTS}/*.{ts,tsx}`],
    ignores: [TESTS],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // React itself only by name: its hooks are logic, an element is not.
          paths: [
            { name: 'react', importNames: ['default', 'createElement', 'cloneElement'], message: NO_UI_IN_LOGIC },
          ],
          patterns: UI_MODULES.map((regex) => ({ regex, message: NO_UI_IN_LOGIC })),
        },
      ],
      'no-restricted-syntax': ['error', NO_UI_DYNAMIC_IMPORT],
    },
  },
  {
    files: [`${LOGIC_SEGMENTS}/*.tsx`],
    ignores: [TESTS],
    rules: {
      // The whole list again: a later config object replaces the options an earlier one gave this rule.
      'no-restricted-syntax': [
        'error',
        { selector: 'Program', message: `A .tsx file is UI: ${NO_UI_IN_LOGIC}` },
        NO_UI_DYNAMIC_IMPORT,
      ],
    },
  },
  {
    // There is no HTTP client to exempt: the site is static (ARCHITECTURE.md).
    files: [SOURCES],
    ignores: [TESTS],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: NO_OWN_REQUESTS },
        { name: 'XMLHttpRequest', message: NO_OWN_REQUESTS },
      ],
      'no-restricted-properties': [
        'error',
        ...['window', 'globalThis', 'self'].map((object) => ({ object, property: 'fetch', message: NO_OWN_REQUESTS })),
      ],
    },
  },
  {
    files: [SOURCES],
    ignores: LAYERS.map((layer) => `src/${layer}/**`),
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: `src/ holds only the layers ${LAYERS.join(', ')}: this file belongs in one of them.`,
        },
      ],
    },
  },
  {
    files: [OTHER_CODE],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: 'src/ holds TypeScript in .ts and .tsx files, the only ones these rules read.',
        },
      ],
    },
  },
  {
    // A committed .only is rejected by Vitest itself (allowOnly in vitest.config.ts).
    files: [TESTS],
    rules: {
      // fsd-lint 1.2.1 skips tests in this rule only on POSIX (it matches the path unnormalised): off on every OS.
      'fsd/no-relative-imports': 'off',
      'no-restricted-properties': [
        'error',
        ...['skip', 'todo', 'skipIf', 'runIf'].map((property) => ({ property, message: EVERY_TEST_RUNS })),
      ],
    },
  },
])
