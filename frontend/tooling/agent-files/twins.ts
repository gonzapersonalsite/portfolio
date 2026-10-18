import type { Experience } from '../../src/entities/experience/model/types.ts'
import type { Project } from '../../src/entities/project/model/types.ts'
import { getAllExperiences } from '../../src/entities/experience/api/experienceApi.ts'
import { getProfile } from '../../src/entities/profile/api/profileApi.ts'
import { getAllProjects, getFeaturedProjects } from '../../src/entities/project/api/projectApi.ts'
import { getCoreSkills, getSkillGroups } from '../../src/entities/skill/api/skillApi.ts'
import { getAllSpokenLanguages } from '../../src/entities/spoken-language/api/languageApi.ts'
import { getLocalizedText } from '../../src/shared/lib/getLocalizedText.ts'
import { formatPercent, formatPeriod } from '../../src/shared/lib/localeFormat.ts'
import { TWIN_LABELS, type TwinLabels } from './labels.ts'
import { richTextToBlocks } from './richText.ts'
import { ROUTES, twinPathOf, type Locale, type RouteId } from './routes.ts'

const join = (blocks: readonly string[]): string => blocks.filter((block) => block.length > 0).join('\n\n')

const finish = (markdown: string): string => `${markdown}\n`

// The entity data tests reject duplicated technologies, so the list is rendered as is.
const technologiesLine = (labels: TwinLabels, technologies: readonly string[]): string =>
  technologies.length === 0 ? '' : `**${labels.technologies}:** ${technologies.join(', ')}`

// Mirrors the availability badge shown on the Home hero and the Experience page.
const openToWorkLine = (labels: TwinLabels): string => `**${labels.openToWork}**`

// Every twin ends with the other pages, so an agent can reach the whole site from any of them.
const pagesSection = (locale: Locale, labels: TwinLabels, current: RouteId): string =>
  join([
    `## ${labels.pages}`,
    ROUTES.filter((route) => route.id !== current)
      .map((route) => `- [${labels.nav[route.id]}](${twinPathOf(route, locale)})`)
      .join('\n'),
  ])

type Heading = '##' | '###'

// Same labels and order as the buttons on the project card. The heading sits one level below
// the section that lists the project: the page title on /projects, "Featured Projects" on Home.
const projectBlock = (project: Project, locale: Locale, labels: TwinLabels, heading: Heading): string =>
  join([
    `${heading} ${getLocalizedText(locale, project.titleEn, project.titleEs)}`,
    `*${labels.types[project.type]}*`,
    ...richTextToBlocks(getLocalizedText(locale, project.descriptionEn, project.descriptionEs)),
    technologiesLine(labels, project.technologies),
    project.links.map((link) => `- [${labels.links[link.kind]}](${link.url})`).join('\n'),
  ])

const experienceBlock = (experience: Experience, locale: Locale, labels: TwinLabels): string => {
  const company = getLocalizedText(locale, experience.companyEn, experience.companyEs)
  const range = formatPeriod(experience.startDate, experience.endDate, locale, labels.present)

  return join([
    `## ${getLocalizedText(locale, experience.positionEn, experience.positionEs)}`,
    company === '' ? range : `${company} · ${range}`,
    ...richTextToBlocks(getLocalizedText(locale, experience.descriptionEn, experience.descriptionEs)),
    technologiesLine(labels, experience.technologies),
  ])
}

// Same groups, order and percentage format as the Skills page.
const skillsByCategory = (locale: Locale, labels: TwinLabels): string =>
  getSkillGroups()
    .map(({ category, skills }) =>
      join([
        `## ${labels.skillCategories[category]}`,
        skills
          .map(
            (skill) =>
              `- ${getLocalizedText(locale, skill.nameEn, skill.nameEs)} — ${formatPercent(skill.level, locale)}`,
          )
          .join('\n'),
      ]),
    )
    .join('\n\n')

const buildHome = (locale: Locale, labels: TwinLabels): string => {
  const profile = getProfile()

  return finish(
    join([
      `# ${getLocalizedText(locale, profile.fullNameEn, profile.fullNameEs)}`,
      `> ${getLocalizedText(locale, profile.subtitleEn, profile.subtitleEs)}`,
      openToWorkLine(labels),
      ...richTextToBlocks(getLocalizedText(locale, profile.descriptionEn, profile.descriptionEs)),
      join([
        `## ${labels.featuredProjects}`,
        getFeaturedProjects()
          .map((project) => projectBlock(project, locale, labels, '###'))
          .join('\n\n'),
      ]),
      pagesSection(locale, labels, 'home'),
    ]),
  )
}

const buildAbout = (locale: Locale, labels: TwinLabels): string => {
  const profile = getProfile()
  const competencies = getCoreSkills()
    .map((skill) => `- ${getLocalizedText(locale, skill.nameEn, skill.nameEs)}`)
    .join('\n')
  const languages = getAllSpokenLanguages()
    .map(
      (language) =>
        `- ${getLocalizedText(locale, language.nameEn, language.nameEs)} (${getLocalizedText(locale, language.levelEn, language.levelEs)})`,
    )
    .join('\n')

  return finish(
    join([
      `# ${getLocalizedText(locale, profile.aboutTitleEn, profile.aboutTitleEs)}`,
      getLocalizedText(locale, profile.aboutIntroTitleEn, profile.aboutIntroTitleEs),
      ...richTextToBlocks(getLocalizedText(locale, profile.aboutSummaryEn, profile.aboutSummaryEs)),
      ...richTextToBlocks(getLocalizedText(locale, profile.aboutPhilosophyEn, profile.aboutPhilosophyEs)),
      join([
        `## ${labels.aboutSentenceTitle}`,
        `> ${getLocalizedText(locale, profile.sentenceEn, profile.sentenceEs)}`,
      ]),
      join([`## ${labels.aboutCoreCompetencies}`, competencies]),
      join([`## ${labels.aboutLanguages}`, languages]),
      profile.cvUrl === '' ? '' : `[${labels.downloadCv}](${profile.cvUrl})`,
      pagesSection(locale, labels, 'about'),
    ]),
  )
}

const buildSkills = (locale: Locale, labels: TwinLabels): string =>
  finish(join([`# ${labels.skillsHeading}`, skillsByCategory(locale, labels), pagesSection(locale, labels, 'skills')]))

const buildExperience = (locale: Locale, labels: TwinLabels): string =>
  finish(
    join([
      `# ${labels.experienceHeading}`,
      openToWorkLine(labels),
      getAllExperiences()
        .map((experience) => experienceBlock(experience, locale, labels))
        .join('\n\n'),
      pagesSection(locale, labels, 'experience'),
    ]),
  )

const buildProjects = (locale: Locale, labels: TwinLabels): string =>
  finish(
    join([
      `# ${labels.projectsHeading}`,
      getAllProjects()
        .map((project) => projectBlock(project, locale, labels, '##'))
        .join('\n\n'),
      pagesSection(locale, labels, 'projects'),
    ]),
  )

const buildContact = (locale: Locale, labels: TwinLabels): string => {
  const profile = getProfile()
  const details = [
    `- **${labels.contactEmail}:** [${profile.email}](mailto:${profile.email})`,
    `- **${labels.contactLocation}:** ${getLocalizedText(locale, profile.locationEn, profile.locationEs)}`,
  ].join('\n')
  const social = [`- [GitHub](${profile.githubUrl})`, `- [LinkedIn](${profile.linkedinUrl})`].join('\n')

  return finish(
    join([
      `# ${labels.contactHeading}`,
      labels.contactDescription,
      details,
      `## ${labels.contactSocial}`,
      social,
      pagesSection(locale, labels, 'contact'),
    ]),
  )
}

const BUILDERS: Record<RouteId, (locale: Locale, labels: TwinLabels) => string> = {
  home: buildHome,
  about: buildAbout,
  skills: buildSkills,
  experience: buildExperience,
  projects: buildProjects,
  contact: buildContact,
}

export const buildTwin = (routeId: RouteId, locale: Locale): string => BUILDERS[routeId](locale, TWIN_LABELS[locale])
