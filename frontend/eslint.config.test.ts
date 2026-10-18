// @vitest-environment node
import { lstatSync, mkdtempSync, readFileSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ESLint, type Linter } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

// Each architecture rule of eslint.config.js, seen firing on the smallest file
// that breaks it, and seen silent on files that keep to it: relaxing a rule
// turns its case red here, not only in a review.
const eslint = new ESLint({ cwd: import.meta.dirname })

// The first lint loads eslint.config.js, its plugins and the parser: a cold start of
// seconds that would otherwise count against the first case's 5 s timeout.
beforeAll(async () => {
  await eslint.lintText('', { filePath: 'src/app/warmup.ts' })
}, 30_000)

async function lint(path: string, code: string): Promise<Linter.LintMessage[]> {
  const [result] = await eslint.lintText(code, { filePath: path })
  return result.messages
}

// The rule of a report, or its text when it has none (a parsing error, an ignored comment).
const ruleOf = (message: Linter.LintMessage): string => message.ruleId ?? message.message

// Errors only: a rule lowered to a warning no longer breaks the file, and its case turns red.
async function rulesBrokenBy(path: string, code: string): Promise<string[]> {
  const messages = await lint(path, code)
  return messages.filter((message) => message.severity === 2).map(ruleOf)
}

// Every report, warnings included: a warning is red too, so a file that keeps
// to the rules gets none.
async function reportsOn(path: string, code: string): Promise<string[]> {
  const messages = await lint(path, code)
  return messages.map(ruleOf)
}

describe('the layers of Feature-Sliced Design', () => {
  it.each([
    [
      'a layer importing from a layer above it',
      'src/entities/project/model/contact.ts',
      "import { ContactForm } from '@/features/contact-form'\nexport const form = ContactForm\n",
      'fsd/forbidden-imports',
    ],
    [
      'a slice importing a sibling of its own layer',
      'src/features/contact-form/model/theme.ts',
      "import { useColorMode } from '@/features/theme-switch'\nexport const mode = useColorMode\n",
      'fsd/no-cross-slice-dependency',
    ],
    [
      'a relative import that leaves its slice',
      'src/features/contact-form/ui/Picker.tsx',
      "import { ProjectCard } from '../../../entities/project'\nexport const Card = ProjectCard\n",
      'fsd/no-relative-imports',
    ],
    [
      'a deep import into a slice',
      'src/pages/home/ui/Board.tsx',
      "import { PROJECT_LINK_KINDS } from '@/entities/project/model/projectLinks'\nexport const kinds = PROJECT_LINK_KINDS\n",
      'fsd/no-public-api-sidestep',
    ],
    [
      'an import of a segment instead of the slice',
      'src/pages/home/ui/Board.tsx',
      "import { getAllProjects } from '@/entities/project/api'\nexport const projects = getAllProjects\n",
      'fsd/no-public-api-sidestep',
    ],
    [
      'a deep import into a feature',
      'src/pages/contact/ui/Board.tsx',
      "import ContactForm from '@/features/contact-form/ui/ContactForm'\nexport const Form = ContactForm\n",
      'fsd/no-public-api-sidestep',
    ],
    [
      'a deep import into a widget',
      'src/pages/home/ui/Board.tsx',
      "import { Navbar } from '@/widgets/navbar/ui/Navbar'\nexport const Bar = Navbar\n",
      'fsd/no-public-api-sidestep',
    ],
    [
      'a deep import into a page',
      'src/app/routing/Shell.tsx',
      "import HomePage from '@/pages/home/ui/HomePage'\nexport const Page = HomePage\n",
      'fsd/no-public-api-sidestep',
    ],
    [
      'a dynamic import of a sibling of its own layer',
      'src/features/contact-form/model/lazy.ts',
      "export const load = () => import('@/features/theme-switch')\n",
      'fsd/no-cross-slice-dependency',
    ],
    [
      'a dynamic relative import that leaves its slice',
      'src/features/contact-form/ui/lazy.ts',
      "export const load = () => import('../../../entities/project')\n",
      'fsd/no-relative-imports',
    ],
    [
      'a dynamic deep import into a slice',
      'src/pages/home/ui/lazy.ts',
      "export const load = () => import('@/entities/project/model/projectLinks')\n",
      'fsd/no-public-api-sidestep',
    ],
    ['a folder of src that is not a layer', 'src/services/api.ts', 'export const api = 1\n', 'no-restricted-syntax'],
    [
      'a folder of src that is not a layer, re-exporting',
      'src/services/index.ts',
      "export { api } from './api'\n",
      'no-restricted-syntax',
    ],
    [
      'a file at the root of src',
      'src/utils.ts',
      'export const twice = (n: number) => n * 2\n',
      'no-restricted-syntax',
    ],
    [
      'the entry point at the root of src',
      'src/main.tsx',
      "import { createRoot } from 'react-dom/client'\nexport const root = createRoot\n",
      'no-restricted-syntax',
    ],
    [
      'ambient declarations at the root of src',
      'src/vite-env.d.ts',
      'declare const __APP_VERSION__: string\n',
      'no-restricted-syntax',
    ],
  ])('rejects %s', async (_case, path, code, rule) => {
    expect(await rulesBrokenBy(path, code)).toContain(rule)
  })

  it.each(['js', 'jsx', 'mjs', 'cjs', 'mts', 'cts'])(
    'rejects code in a .%s file, which none of the rules would read',
    async (extension) => {
      // A statement that every module system parses: a .cjs file rejects export.
      expect(await rulesBrokenBy(`src/entities/project/model/legacy.${extension}`, 'const legacy = 1\n')).toContain(
        'no-restricted-syntax',
      )
    },
  )

  it('accepts imports that go down the layers through each public API', async () => {
    const code =
      "import { ProjectCard } from '@/entities/project'\nimport { ContactForm } from '@/features/contact-form'\nimport { useContent } from '@/shared/lib'\nexport const parts = [ProjectCard, ContactForm, useContent]\n"

    expect(await reportsOn('src/pages/home/ui/Board.tsx', code)).toEqual([])
  })

  it('accepts the entry point inside app, importing its own segments relatively', async () => {
    const code =
      "import { AppProviders } from './providers'\nimport AppRouter from './routing/AppRouter'\nimport './styles/index.css'\nexport const parts = [AppProviders, AppRouter]\n"

    expect(await reportsOn('src/app/main.tsx', code)).toEqual([])
  })

  it('leaves a test free of the import rules of the layers', async () => {
    // A layer above, a sibling slice, a deep import and a relative path out of the slice,
    // imported, re-exported and imported dynamically.
    const code =
      "import { Navbar } from '@/widgets/navbar'\nimport { useColorMode } from '@/features/theme-switch'\nimport { PROJECT_LINK_KINDS } from '@/entities/project/model/projectLinks'\nimport { ProjectCard } from '../../../entities/project'\nexport const parts = [Navbar, useColorMode, PROJECT_LINK_KINDS, ProjectCard]\nexport { Footer } from '@/widgets/footer'\nexport { useLanguage } from '@/features/language-switch'\nexport { ThemeContext } from '@/features/theme-switch/model/ThemeContext'\nexport { splitDescription } from '../../../entities/project/lib/splitDescription'\nexport const load = () => import('@/widgets/footer')\n"

    expect(await reportsOn('src/features/contact-form/ui/ContactForm.extra.test.tsx', code)).toEqual([])
  })
})

// The checks of fsd-gaps/boundaries a file breaks: one local rule, a message per check.
async function gapChecksBrokenBy(path: string, code: string): Promise<string[]> {
  const messages = await lint(path, code)
  return messages
    .filter((message) => message.severity === 2 && message.ruleId === 'fsd-gaps/boundaries')
    .map((message) => message.messageId ?? message.message)
    .sort()
}

describe('the layers over what fsd-lint 1.2.1 does not read: re-exports and a dynamic import()', () => {
  it.each([
    [
      'a re-export from a layer above',
      'src/entities/project/model/contact.ts',
      "export { ContactForm } from '@/features/contact-form'\n",
      ['reExportFromAbove'],
    ],
    [
      'a re-export of everything from a layer above',
      'src/entities/project/model/contact.ts',
      "export * from '@/features/contact-form'\n",
      ['reExportFromAbove'],
    ],
    [
      'a relative re-export from a layer above',
      'src/entities/project/model/contact.ts',
      "export { ContactForm } from '../../../features/contact-form'\n",
      ['reExportFromAbove', 'reExportOutOfSlice'],
    ],
    [
      'a re-export from a sibling of its own layer',
      'src/features/contact-form/model/theme.ts',
      "export { useColorMode } from '@/features/theme-switch'\n",
      ['reExportFromSibling'],
    ],
    [
      'a relative re-export from a sibling of its own layer',
      'src/features/contact-form/model/theme.ts',
      "export { useColorMode } from '../../theme-switch'\n",
      ['reExportFromSibling', 'reExportOutOfSlice'],
    ],
    [
      'a re-export of a segment instead of the slice',
      'src/pages/home/model/parts.ts',
      "export { getAllProjects } from '@/entities/project/api'\n",
      ['reExportPastPublicApi'],
    ],
    [
      'a deep re-export from an entity',
      'src/pages/home/ui/Board.tsx',
      "export { PROJECT_LINK_KINDS } from '@/entities/project/model/projectLinks'\n",
      ['reExportPastPublicApi'],
    ],
    [
      'a deep re-export from a feature',
      'src/pages/contact/model/parts.ts',
      "export { default as ContactForm } from '@/features/contact-form/ui/ContactForm'\n",
      ['reExportPastPublicApi'],
    ],
    [
      'a deep re-export from a widget',
      'src/pages/home/model/parts.ts',
      "export { default as Navbar } from '@/widgets/navbar/ui/Navbar'\n",
      ['reExportPastPublicApi'],
    ],
    [
      'a deep re-export from a page',
      'src/app/routing/pages.ts',
      "export { default as HomePage } from '@/pages/home/ui/HomePage'\n",
      ['reExportPastPublicApi'],
    ],
    [
      'a relative re-export that leaves its slice',
      'src/features/contact-form/model/parts.ts',
      "export { PROJECT_LINK_KINDS } from '../../../entities/project/model/projectLinks'\n",
      ['reExportOutOfSlice'],
    ],
    [
      'a relative re-export that leaves src',
      'src/shared/config/build.ts',
      "export { default } from '../../../vite.config'\n",
      ['reExportOutOfSlice'],
    ],
    [
      'a dynamic import of a layer above',
      'src/entities/project/model/lazy.ts',
      "export const load = () => import('@/features/contact-form')\n",
      ['dynamicImportFromAbove'],
    ],
    [
      'a dynamic relative import of a layer above',
      'src/entities/project/model/lazy.ts',
      "export const load = () => import('../../../features/contact-form')\n",
      ['dynamicImportFromAbove'],
    ],
    [
      'a re-export from a layer above, after a doubled slash',
      'src/entities/project/model/contact.ts',
      "export { ContactForm } from '@//features/contact-form'\n",
      ['reExportFromAbove'],
    ],
    [
      'a re-export from a layer above, through a dot segment',
      'src/shared/config/app.ts',
      "export * from '@/./app/main'\n",
      ['reExportFromAbove'],
    ],
    [
      'a re-export from a sibling, reached through another layer',
      'src/features/contact-form/model/theme.ts',
      "export { useColorMode } from '@/shared/../features/theme-switch'\n",
      ['reExportFromSibling'],
    ],
    [
      'a dynamic import of a layer above, after a doubled slash',
      'src/entities/project/model/lazy.ts',
      "export const load = () => import('@//features/contact-form')\n",
      ['dynamicImportFromAbove'],
    ],
    [
      'a deep re-export from a widget, after a doubled slash',
      'src/pages/home/model/parts.ts',
      "export { default as Navbar } from '@//widgets/navbar/ui/Navbar'\n",
      ['reExportPastPublicApi'],
    ],
    [
      'a re-export from a layer above, out of src and back in',
      'src/entities/project/model/contact.ts',
      "export { ContactForm } from '@/../src/features/contact-form'\n",
      ['reExportFromAbove'],
    ],
    [
      'a dynamic relative import of a layer above, out of src and back in',
      'src/entities/project/model/lazy.ts',
      "export const load = () => import('../../../../src/features/contact-form')\n",
      ['dynamicImportFromAbove'],
    ],
  ])('rejects %s', async (_case, path, code, checks) => {
    expect(await gapChecksBrokenBy(path, code)).toEqual(checks)
  })

  it('accepts re-exports that go down the layers through each public API', async () => {
    // The public API named as fsd-lint takes it in an import: the folder, with or without
    // a trailing slash, or its index bare, with .ts or with the .js TypeScript resolves.
    const code =
      "export { ProjectCard } from '@/entities/project'\nexport * from '@/features/contact-form'\nexport { useContent } from '@/shared/lib'\nexport type { Project } from '@/entities/project/index'\nexport { getAllProjects } from '@/entities/project/index.ts'\nexport { getFeaturedProjects } from '@/entities/project/index.js'\nexport { ContactForm } from '@/features/contact-form/'\n"

    expect(await reportsOn('src/pages/home/model/parts.ts', code)).toEqual([])
  })

  it('accepts a re-export through a public API named with a doubled slash', async () => {
    // TypeScript resolves '@/widgets//navbar' to the slice itself.
    const code = "export { Navbar } from '@/widgets//navbar'\n"

    expect(await reportsOn('src/pages/home/model/parts.ts', code)).toEqual([])
  })

  it('leaves alone what the alias does not place in src: a scoped package and a path out of src', async () => {
    // '@app/tokens' is a package, not the alias, and '@/../app/config' resolves outside src.
    const code = "export { tokens } from '@app/tokens'\nexport { config } from '@/../app/config'\n"

    expect(await reportsOn('src/entities/project/model/contact.ts', code)).toEqual([])
  })

  it('accepts the index of a slice re-exporting its own segments', async () => {
    const code =
      "export { getAllProjects, getFeaturedProjects } from './api/projectApi'\nexport { default as ProjectCard } from './ui/ProjectCard'\nexport type { Project } from './model/types'\n"

    expect(await reportsOn('src/entities/project/index.ts', code)).toEqual([])
  })

  it('accepts relative re-exports between the segments of a layer without slices', async () => {
    expect(await reportsOn('src/shared/lib/index.ts', "export { APP_ROUTES } from '../config'\n")).toEqual([])
  })

  it('leaves to convention a re-export into its own slice through the alias', async () => {
    // A cycle the lint does not see, as an import of its own slice through the alias.
    const code = "export { PROJECT_LINK_KINDS } from '@/entities/project/model/projectLinks'\n"

    expect(await reportsOn('src/entities/project/index.ts', code)).toEqual([])
  })

  it('accepts a dynamic import down the layers and inside its slice', async () => {
    const code =
      "export const loadForm = () => import('@/features/contact-form')\nexport const loadPage = () => import('./HomePage')\n"

    expect(await reportsOn('src/pages/home/ui/lazy.ts', code)).toEqual([])
  })

  it('leaves alone a dynamic import whose path is computed, which no rule can read', async () => {
    const code = 'export const load = (module: string) => import(module)\n'

    expect(await reportsOn('src/shared/lib/load.ts', code)).toEqual([])
  })

  // Left to convention: every rule reads the path of an import() only when it is a string literal, and none
  // reads a type that imports. A rule that starts reading them turns its case red, and the convention goes.
  it.each([
    [
      'a_dynamic_import_of_a_layer_above_whose_path_is_a_template_literal',
      'src/entities/project/model/lazy.ts',
      'export const load = () => import(`@/features/contact-form`)\n',
    ],
    [
      'a_dynamic_import_of_a_sibling_slice_whose_path_is_a_template_literal',
      'src/features/contact-form/model/lazy.ts',
      'export const load = () => import(`@/features/theme-switch`)\n',
    ],
    [
      'a_type_that_imports_a_layer_above_with_typeof_import',
      'src/entities/project/model/form.ts',
      "export type Form = typeof import('@/features/contact-form')\n",
    ],
    [
      'a_type_that_imports_a_layer_above_with_import_type',
      'src/shared/lib/project.ts',
      "export type Project = import('@/entities/project').Project\n",
    ],
  ])('leaves_to_convention_%s_which_no_rule_reads', async (_case, path, code) => {
    const reports = await reportsOn(path, code)

    expect(reports).toEqual([])
  })

  it('holds in a project reached through a link or a junction', async () => {
    // Node loads eslint.config.js by its real path, and ESLint names a file by the path it reached it by.
    const folder = mkdtempSync(join(tmpdir(), 'fsd-gaps-'))
    const project = join(folder, 'project')
    try {
      symlinkSync(import.meta.dirname, project, 'junction')
      const throughLink = new ESLint({ cwd: project })
      const [result] = await throughLink.lintText("export * from '@/app/main'\n", { filePath: 'src/shared/lib/up.ts' })

      expect(result.messages.map((message) => message.messageId)).toEqual(['reExportFromAbove'])
    } finally {
      // unlink removes the link itself, never what it points to.
      if (lstatSync(project, { throwIfNoEntry: false })) unlinkSync(project)
      rmdirSync(folder)
    }
  })
})

describe('build-time code outside src', () => {
  it.each([
    [
      'the tooling reading the content it publishes',
      'tooling/agent-files/llmsTxt.ts',
      "import { getAllProjects } from '../../src/entities/project/api/projectApi.ts'\nexport const projects = getAllProjects\n",
    ],
    [
      'the build configuration loading the tooling',
      'vite.config.ts',
      "import { agentFilesPlugin } from './tooling/agent-files/vitePlugin.ts'\nexport const plugin = agentFilesPlugin\n",
    ],
  ])('leaves the layer rules to src: accepts %s', async (_case, path, code) => {
    expect(await reportsOn(path, code)).toEqual([])
  })
})

describe('no UI in the model, api and lib segments', () => {
  it.each([
    ['a .tsx file', 'src/entities/project/model/view.tsx', 'export const view = 1\n', 'no-restricted-syntax'],
    [
      'an import of its slice ui',
      'src/features/contact-form/model/form.ts',
      "import ContactForm from '../ui/ContactForm'\nexport const form = ContactForm\n",
      'no-restricted-imports',
    ],
    [
      'an import of the shared ui',
      'src/features/contact-form/api/notify.ts',
      "import { StatusBadge } from '@/shared/ui'\nexport const badge = StatusBadge\n",
      'no-restricted-imports',
    ],
    [
      'an import of react-dom',
      'src/entities/project/model/portal.ts',
      "import { createPortal } from 'react-dom'\nexport const portal = createPortal\n",
      'no-restricted-imports',
    ],
    [
      'an import of react-dom/client',
      'src/entities/project/model/root.ts',
      "import { createRoot } from 'react-dom/client'\nexport const root = createRoot\n",
      'no-restricted-imports',
    ],
    [
      'an import of react-dom/server',
      'src/entities/project/model/html.ts',
      "import { renderToString } from 'react-dom/server'\nexport const html = renderToString\n",
      'no-restricted-imports',
    ],
    [
      'the JSX runtime',
      'src/entities/project/model/runtime.ts',
      "import { jsx } from 'react/jsx-runtime'\nexport const element = jsx('p', {})\n",
      'no-restricted-imports',
    ],
    [
      'the JSX dev runtime',
      'src/entities/project/model/runtime.ts',
      "import { jsxDEV } from 'react/jsx-dev-runtime'\nexport const element = jsxDEV\n",
      'no-restricted-imports',
    ],
    [
      'an element created without JSX',
      'src/entities/project/model/element.ts',
      "import { createElement } from 'react'\nexport const element = createElement('p')\n",
      'no-restricted-imports',
    ],
    [
      'an element cloned without JSX',
      'src/entities/project/lib/clone.ts',
      "import { cloneElement } from 'react'\nexport const clone = cloneElement\n",
      'no-restricted-imports',
    ],
    [
      'React as a default import',
      'src/entities/project/model/element.ts',
      "import React from 'react'\nexport const element = React.createElement('p')\n",
      'no-restricted-imports',
    ],
    [
      'React as a namespace',
      'src/entities/project/model/element.ts',
      "import * as React from 'react'\nexport const element = React.createElement('p')\n",
      'no-restricted-imports',
    ],
    [
      'a component of the UI kit',
      'src/features/contact-form/model/button.ts',
      "import { Button } from '@mui/material'\nexport const Submit = Button\n",
      'no-restricted-imports',
    ],
    [
      'a type of the UI kit',
      'src/shared/lib/severity.ts',
      "import type { AlertColor } from '@mui/material'\nexport type Severity = AlertColor\n",
      'no-restricted-imports',
    ],
    [
      'an icon of the UI kit',
      'src/shared/lib/icon.ts',
      "import SendIcon from '@mui/icons-material/Send'\nexport const icon = SendIcon\n",
      'no-restricted-imports',
    ],
    [
      'a styled component',
      'src/entities/project/lib/card.ts',
      "import { styled } from '@mui/material/styles'\nexport const Card = styled('div')({ padding: 8 })\n",
      'no-restricted-imports',
    ],
    [
      'an Emotion styled component',
      'src/shared/lib/card.ts',
      "import styled from '@emotion/styled'\nexport const Card = styled.div({ padding: 8 })\n",
      'no-restricted-imports',
    ],
    [
      'a dynamic import of the UI kit',
      'src/features/contact-form/api/lazy.ts',
      "export const load = () => import('@mui/material')\n",
      'no-restricted-syntax',
    ],
    [
      'a dynamic import of its slice ui',
      'src/features/contact-form/model/lazy.ts',
      "export const load = () => import('../ui/ContactForm')\n",
      'no-restricted-syntax',
    ],
    [
      'a dynamic import of react-dom',
      'src/features/contact-form/api/lazy.ts',
      "export const load = () => import('react-dom/client')\n",
      'no-restricted-syntax',
    ],
    [
      'a dynamic import of the JSX runtime',
      'src/app/layouts/lib/lazy.ts',
      "export const load = () => import('react/jsx-runtime')\n",
      'no-restricted-syntax',
    ],
    [
      'a dynamic import of styles',
      'src/shared/lib/lazy.ts',
      "export const load = () => import('./theme.module.css')\n",
      'no-restricted-syntax',
    ],
    [
      'a dynamic import of React, which brings it as a whole',
      'src/entities/project/model/lazy.ts',
      "export const load = () => import('react')\n",
      'no-restricted-syntax',
    ],
  ])('rejects %s', async (_case, path, code, rule) => {
    expect(await rulesBrokenBy(path, code)).toContain(rule)
  })

  it.each(['css', 'scss', 'sass', 'less', 'styl', 'stylus', 'pcss', 'postcss', 'sss', 'css?inline'])(
    'rejects an import of .%s styles',
    async (extension) => {
      const code = `import styles from './theme.module.${extension}'\nexport const theme = styles\n`

      expect(await rulesBrokenBy('src/entities/project/lib/theme.ts', code)).toContain('no-restricted-imports')
    },
  )

  it('sees both the .tsx file and its dynamic import of UI', async () => {
    const broken = await rulesBrokenBy(
      'src/features/contact-form/model/lazy.tsx',
      "export const load = () => import('../ui/ContactForm')\n",
    )

    expect(broken.filter((rule) => rule === 'no-restricted-syntax')).toHaveLength(2)
  })

  it('leaves_to_convention_a_dynamic_import_of_ui_whose_path_is_a_template_literal_which_no_rule_reads', async () => {
    const code = 'export const load = () => import(`../ui/ContactForm`)\n'

    const reports = await reportsOn('src/features/contact-form/model/lazy.ts', code)

    expect(reports).toEqual([])
  })

  it.each([
    [
      'logic that uses React state and its own model',
      'src/entities/project/model/useCover.ts',
      "import { useState } from 'react'\nimport { projectCoverSources } from './projectImages'\nexport const parts = [useState, projectCoverSources]\n",
    ],
    [
      'an api segment reading its static content',
      'src/entities/project/api/projectApi.ts',
      "import projectsData from './data.json' with { type: 'json' }\nexport const projects = projectsData\n",
    ],
    [
      'the api segment loading the EmailJS SDK',
      'src/features/contact-form/api/contactApi.ts',
      "export const load = () => import('@emailjs/browser')\n",
    ],
  ])('accepts %s', async (_case, path, code) => {
    expect(await reportsOn(path, code)).toEqual([])
  })

  it('leaves the tests of those segments free to render', async () => {
    const code =
      "import { render } from '@testing-library/react'\nimport ProjectCard from '../ui/ProjectCard'\nimport { getAllProjects } from '../api/projectApi'\nexport const draw = () => render(<ProjectCard project={getAllProjects()[0]} />)\n"

    expect(await reportsOn('src/entities/project/model/projectImages.view.test.tsx', code)).toEqual([])
  })
})

describe('no request of its own from src', () => {
  it.each([
    ['fetch', "export const send = () => fetch('/contact')\n", 'no-restricted-globals'],
    ['XMLHttpRequest', 'export const open = () => new XMLHttpRequest()\n', 'no-restricted-globals'],
    ['window.fetch', "export const send = () => window.fetch('/contact')\n", 'no-restricted-properties'],
    ['globalThis.fetch', "export const send = () => globalThis.fetch('/contact')\n", 'no-restricted-properties'],
    ['self.fetch', "export const send = () => self.fetch('/contact')\n", 'no-restricted-properties'],
  ])('rejects %s, even in the api segment that sends the contact message', async (_case, code, rule) => {
    expect(await rulesBrokenBy('src/features/contact-form/api/contactApi.ts', code)).toContain(rule)
  })

  it.each([
    ['a component', 'src/pages/contact/ui/ContactPage.tsx'],
    ['a shared helper', 'src/shared/lib/storage.ts'],
  ])('rejects fetch in %s too', async (_case, path) => {
    expect(await rulesBrokenBy(path, "export const send = () => fetch('/contact')\n")).toContain(
      'no-restricted-globals',
    )
  })

  it('leaves tests free to stub the network', async () => {
    const code = "import { expect, it } from 'vitest'\nit('stubs', () => expect(typeof fetch).toBe('function'))\n"

    expect(await reportsOn('src/shared/lib/storage.extra.test.ts', code)).toEqual([])
  })

  it('rejects fetch in src/shared/api too: the site has no HTTP client to exempt', async () => {
    const code = "export const load = () => fetch('/projects')\n"

    expect(await rulesBrokenBy('src/shared/api/transport.ts', code)).toContain('no-restricted-globals')
  })
})

describe('every test runs', () => {
  it.each([
    ['it.skip', "import { it } from 'vitest'\nit.skip('waits', () => {})\n"],
    ['describe.skip', "import { describe } from 'vitest'\ndescribe.skip('waits', () => {})\n"],
    ['it.todo', "import { it } from 'vitest'\nit.todo('later')\n"],
    ['test.skipIf', "import { test } from 'vitest'\ntest.skipIf(true)('waits', () => {})\n"],
    ['it.runIf', "import { it } from 'vitest'\nit.runIf(false)('waits', () => {})\n"],
    ['a skip from inside the test', "import { it } from 'vitest'\nit('waits', (context) => context.skip())\n"],
  ])('rejects %s', async (_case, code) => {
    expect(await rulesBrokenBy('src/entities/project/model/projectImages.extra.test.ts', code)).toContain(
      'no-restricted-properties',
    )
  })

  it('rejects a skipped test of the tooling too', async () => {
    const code = "import { it } from 'vitest'\nit.skip('waits', () => {})\n"

    expect(await rulesBrokenBy('tooling/agent-files/twins.extra.test.ts', code)).toContain('no-restricted-properties')
  })
})

describe('exceptions live in the configuration', () => {
  it('does not let a comment switch a rule off, and warns about the comment', async () => {
    const code = "/* eslint-disable */\nimport { createPortal } from 'react-dom'\nexport const portal = createPortal\n"

    const messages = await lint('src/entities/project/model/portal.ts', code)

    expect(messages).toContainEqual(expect.objectContaining({ ruleId: 'no-restricted-imports', severity: 2 }))
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: null, severity: 1, message: expect.stringContaining("'noInlineConfig'") }),
    )
  })

  it('counts a warning as an error in the lint script', () => {
    const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

    expect(manifest.scripts.lint).toContain('--max-warnings=0')
  })
})
