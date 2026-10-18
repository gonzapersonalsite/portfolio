import { describe, expect, it } from 'vitest'
import { buildLlmsTxt } from './llmsTxt'
import { absoluteUrl } from './routes'

const ENGLISH_TWINS = [
  '/index.md',
  '/about/index.md',
  '/skills/index.md',
  '/experience/index.md',
  '/projects/index.md',
  '/contact/index.md',
]

describe('buildLlmsTxt', () => {
  it('summarizes the site and links every English twin', () => {
    const llms = buildLlmsTxt()

    expect(llms.startsWith('# Gonzalo Martínez\n')).toBe(true)
    expect(llms).toContain('> Junior Full Stack Developer')
    expect(llms).toContain('Palma de Mallorca')

    for (const path of ENGLISH_TWINS) {
      expect(llms).toContain(`](${absoluteUrl(path)})`)
    }
  })

  it('includes a Spanish section with the Spanish twins', () => {
    const llms = buildLlmsTxt()

    expect(llms).toContain('## Español')

    for (const path of ['/index.es.md', '/about/index.es.md', '/projects/index.es.md']) {
      expect(llms).toContain(`](${absoluteUrl(path)})`)
    }
  })

  it('lists the projects and the contact details', () => {
    const llms = buildLlmsTxt()

    expect(llms).toContain('- [Kanban Board App](https://kanban-board-app-kappa.vercel.app/)')
    expect(llms).toContain('- [Gonzalo Apps – App Hub](https://gonzaloapps.es/)')
    expect(llms).toContain('- Email: gonzalomartinezg2001@gmail.com')
    expect(llms).toContain('- GitHub: https://github.com/gonzapersonalsite')
    expect(llms).toContain('- LinkedIn: https://www.linkedin.com/in/')
  })

  it('describes each project by type and main stack, links its first primary link and keeps the rest', () => {
    const llms = buildLlmsTxt()

    expect(llms).toContain(
      '- [Kanban Board App](https://kanban-board-app-kappa.vercel.app/): Web App — React, TypeScript, Vite, Feature-Sliced Design ([Repository](https://github.com/gonzapersonalsite/kanban-board-app))',
    )
    expect(llms).toContain(
      '- [License Generator](https://github.com/gonzapersonalsite/license-generator-docs/releases/latest): Desktop App — ',
    )
    expect(llms).toContain('([Documentation](https://github.com/gonzapersonalsite/license-generator-docs))')
    // No primary link: the title stays plain and the documentation link is kept.
    expect(llms).toMatch(
      /^- NutriManager: Desktop App — .+ \(\[Documentation\]\(https:\/\/github\.com\/gonzapersonalsite\/nutrimanager-docs\)\)$/m,
    )
  })
})
