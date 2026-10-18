import { describe, expect, it } from 'vitest'
import { TWIN_LABELS } from './labels'
import { ROUTES, twinPathOf } from './routes'
import { buildTwin } from './twins'

describe('buildTwin', () => {
  it('renders the English home twin with hero, featured projects and page links', () => {
    const markdown = buildTwin('home', 'en')

    expect(markdown.startsWith('# Gonzalo Martínez\n')).toBe(true)
    expect(markdown).toContain('> Junior Full Stack Developer\n\n**Open to work**')
    expect(markdown).toContain('## Featured Projects')
    expect(markdown).toContain('### License Generator')
    expect(markdown).not.toContain('### Kanban Board App')
    expect(markdown).toContain('](/projects/index.md)')
  })

  it('renders Spanish content in the Spanish twins', () => {
    const markdown = buildTwin('home', 'es')

    expect(markdown).toContain('> Desarrollador Full Stack junior\n\n**Disponible para trabajar**')
    expect(markdown).toContain('### Quotidia – Planificador diario')
    expect(markdown).toContain('](/projects/index.es.md)')
  })

  it('renders the about twin with sentence, competencies, languages and CV', () => {
    const markdown = buildTwin('about', 'en')

    expect(markdown).toContain('## A sentence that defines me')
    expect(markdown).toContain('## Core Competencies')
    expect(markdown).toContain('## Languages')
    expect(markdown).toContain('[Download CV](https://')
  })

  it('lists the same core competencies as the About page: development skills only', () => {
    const competencies = buildTwin('about', 'en').split('## Core Competencies\n\n')[1].split('\n\n')[0]

    expect(competencies).toContain('- React')
    expect(competencies).toContain('- Flutter')
    expect(competencies).not.toContain('- Windows')
    expect(competencies).not.toContain('- Hardware repair')
  })

  it('renders skills grouped by category, in the Skills page order and number format', () => {
    const markdown = buildTwin('skills', 'en')
    const spanish = buildTwin('skills', 'es')

    expect(markdown.startsWith('# Technical Expertise\n\n## Frontend\n')).toBe(true)
    expect(markdown.indexOf('## Mobile')).toBeLessThan(markdown.indexOf('## Tools'))
    expect(markdown).toContain('- React — 80%')
    expect(spanish).toContain('## Herramientas')
    expect(spanish).toContain('- React — 80 %')
  })

  it('renders experience entries with the availability badge, date range and bullet lists', () => {
    const markdown = buildTwin('experience', 'en')

    expect(markdown.startsWith('# Work History\n\n**Open to work**\n')).toBe(true)
    expect(markdown).toContain('## Internship – Higher Vocational Training (CFGS)')
    expect(markdown).toContain('Mistertransfer · Mar 2025 – Jun 2025')
    expect(markdown).toContain('- Development and maintenance of software in a microservices environment.')
    const spanish = buildTwin('experience', 'es')
    expect(spanish).toContain('**Disponible para trabajar**')
    expect(spanish).toContain('## Prácticas formativas (CFGS)')
    expect(spanish).toContain('Mistertransfer · mar 2025 – jun 2025')
  })

  it('renders every project with its links', () => {
    const markdown = buildTwin('projects', 'es')

    expect(markdown).toContain('## Portafolio profesional')
    expect(markdown).toContain('- [Visitar web](https://mi-portafolio-gonzalo.vercel.app/)')
    expect(markdown).toContain('- [Repositorio](https://github.com/')
    expect(markdown).toContain('## Pokédex')
  })

  it('labels each project link by its kind, in the order of the card buttons', () => {
    const english = buildTwin('projects', 'en')
    const spanish = buildTwin('projects', 'es')

    expect(english).toContain(
      '- [Download](https://github.com/gonzapersonalsite/license-generator-docs/releases/latest)\n- [Documentation](https://github.com/gonzapersonalsite/license-generator-docs)',
    )
    expect(spanish).toContain(
      '- [Descargar](https://github.com/gonzapersonalsite/license-generator-docs/releases/latest)\n- [Documentación](https://github.com/gonzapersonalsite/license-generator-docs)',
    )
    expect(english).toContain('- [Documentation](https://github.com/gonzapersonalsite/nutrimanager-docs)')
    expect(english).toContain(
      '- [Visit Site](https://kanban-board-app-kappa.vercel.app/)\n- [Repository](https://github.com/gonzapersonalsite/kanban-board-app)',
    )
  })

  it('renders contact details and social links', () => {
    const markdown = buildTwin('contact', 'en')

    expect(markdown).toContain('](mailto:')
    expect(markdown).toContain('## FOLLOW ME')
    expect(markdown).toContain('- [GitHub](https://github.com/')
    expect(markdown).toContain('- [LinkedIn](https://www.linkedin.com/')
  })

  it('ends every twin with links to the other pages in the same language', () => {
    for (const route of ROUTES) {
      for (const locale of ['en', 'es'] as const) {
        const pages = buildTwin(route.id, locale).split(`## ${TWIN_LABELS[locale].pages}\n\n`)[1] ?? ''
        const linked = [...pages.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1])

        expect(linked, `${route.id} ${locale}`).toEqual(
          ROUTES.filter((other) => other.id !== route.id).map((other) => twinPathOf(other, locale)),
        )
      }
    }
  })

  it('never skips a heading level', () => {
    for (const route of ROUTES) {
      for (const locale of ['en', 'es'] as const) {
        const levels = [...buildTwin(route.id, locale).matchAll(/^(#+) /gm)].map((match) => match[1].length)

        expect(levels[0], `${route.id} ${locale}`).toBe(1)
        levels.slice(1).forEach((level, index) => {
          expect(level - levels[index], `${route.id} ${locale}`).toBeLessThanOrEqual(1)
        })
      }
    }
  })

  it('ends every twin with a single trailing newline', () => {
    for (const routeId of ['home', 'about', 'skills', 'experience', 'projects', 'contact'] as const) {
      for (const locale of ['en', 'es'] as const) {
        const markdown = buildTwin(routeId, locale)
        expect(markdown.endsWith('\n')).toBe(true)
        expect(markdown.endsWith('\n\n')).toBe(false)
        expect(markdown).not.toContain('\r')
      }
    }
  })
})
