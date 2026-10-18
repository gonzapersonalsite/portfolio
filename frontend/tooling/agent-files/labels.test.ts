import { describe, expect, it } from 'vitest'
import { PROJECT_LINK_KINDS, type ProjectLinkKind } from '../../src/entities/project/model/projectLinks'
import { SKILL_CATEGORY_ORDER } from '../../src/entities/skill/model/categories'
import i18n from '../../src/shared/config/i18n'
import { TWIN_LABELS } from './labels'
import type { Locale } from './routes'

const MIRRORED_LABELS: ReadonlyArray<readonly [string, string]> = [
  ['openToWork', 'common.openToWork'],
  ['nav.home', 'nav.home'],
  ['nav.about', 'nav.about'],
  ['nav.skills', 'nav.skills'],
  ['nav.experience', 'nav.experience'],
  ['nav.projects', 'nav.projects'],
  ['nav.contact', 'nav.contact'],
  ['featuredProjects', 'projects.featured'],
  ['types.WEB', 'projects.types.WEB'],
  ['types.DESKTOP', 'projects.types.DESKTOP'],
  ['types.MOBILE', 'projects.types.MOBILE'],
  ['types.OTHER', 'projects.types.OTHER'],
  ['aboutCoreCompetencies', 'about.skills'],
  ['aboutLanguages', 'about.languages'],
  ['aboutSentenceTitle', 'about.sentenceTitle'],
  ['downloadCv', 'home.resume'],
  ['skillsHeading', 'skills.heading'],
  ['experienceHeading', 'experience.heading'],
  ['present', 'common.present'],
  ['projectsHeading', 'projects.heading'],
  ['contactHeading', 'contact.heading'],
  ['contactDescription', 'contact.description'],
  ['contactEmail', 'contact.email'],
  ['contactLocation', 'contact.location'],
  ['contactSocial', 'contact.social'],
]

const readLabel = (locale: Locale, path: string): string =>
  path
    .split('.')
    .reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], TWIN_LABELS[locale]) as string

describe('twin labels', () => {
  it.each<Locale>(['en', 'es'])('mirror the i18n values for %s', (locale) => {
    for (const [labelPath, i18nKey] of MIRRORED_LABELS) {
      expect(readLabel(locale, labelPath)).toBe(i18n.t(i18nKey, { lng: locale }))
    }
  })

  it.each<Locale>(['en', 'es'])('translate every skill category for %s', (locale) => {
    for (const category of SKILL_CATEGORY_ORDER) {
      const i18nKey = `skills.categories.${category}`
      expect(i18n.exists(i18nKey, { lng: locale }), `missing ${i18nKey}`).toBe(true)
      expect(TWIN_LABELS[locale].skillCategories[category]).toBe(i18n.t(i18nKey, { lng: locale }))
    }
  })

  it.each<Locale>(['en', 'es'])('translate every project link kind for %s', (locale) => {
    for (const kind of Object.keys(PROJECT_LINK_KINDS) as ProjectLinkKind[]) {
      const { labelKey } = PROJECT_LINK_KINDS[kind]
      expect(i18n.exists(labelKey, { lng: locale }), `missing ${labelKey}`).toBe(true)
      expect(TWIN_LABELS[locale].links[kind]).toBe(i18n.t(labelKey, { lng: locale }))
    }
  })
})
