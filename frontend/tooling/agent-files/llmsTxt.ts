import { getProfile } from '../../src/entities/profile/api/profileApi.ts'
import { getAllProjects } from '../../src/entities/project/api/projectApi.ts'
import { isPrimaryLink } from '../../src/entities/project/model/projectLinks.ts'
import type { Project } from '../../src/entities/project/model/types.ts'
import { getLocalizedText } from '../../src/shared/lib/getLocalizedText.ts'
import { TWIN_LABELS } from './labels.ts'
import { richTextToBlocks } from './richText.ts'
import { absoluteUrl, ROUTES, twinPathOf, type Locale } from './routes.ts'

const pageList = (locale: Locale): string =>
  ROUTES.map((route) => `- [${TWIN_LABELS[locale].nav[route.id]}](${absoluteUrl(twinPathOf(route, locale))})`).join(
    '\n',
  )

const STACK_PREVIEW_SIZE = 4

// '- [Title](first primary link): type — main stack ([Other link](url), ...)', so an agent
// learns what each project is and what it is built with without fetching every twin.
const projectLine = (project: Project): string => {
  const english = TWIN_LABELS.en
  const title = getLocalizedText('en', project.titleEn, project.titleEs)
  const primary = project.links.find(isPrimaryLink)
  const heading = primary === undefined ? title : `[${title}](${primary.url})`
  const stack = project.technologies.slice(0, STACK_PREVIEW_SIZE).join(', ')
  const others = project.links
    .filter((link) => link !== primary)
    .map((link) => `[${english.links[link.kind]}](${link.url})`)
  const otherLinks = others.length === 0 ? '' : ` (${others.join(', ')})`

  return `- ${heading}: ${english.types[project.type]} — ${stack}${otherLinks}`
}

export const buildLlmsTxt = (): string => {
  const profile = getProfile()
  const english = TWIN_LABELS.en
  const projects = getAllProjects().map(projectLine).join('\n')

  return [
    `# ${profile.fullNameEn}`,
    '',
    `> ${profile.subtitleEn}`,
    '',
    ...richTextToBlocks(profile.descriptionEn),
    '',
    `Based in ${profile.locationEn}. Every page has an English markdown version and a Spanish one, listed below.`,
    '',
    `## ${english.pages}`,
    pageList('en'),
    '',
    `## ${english.projectsHeading}`,
    projects,
    '',
    '## Español',
    pageList('es'),
    '',
    `## ${english.contactHeading}`,
    `- ${english.contactEmail}: ${profile.email}`,
    `- GitHub: ${profile.githubUrl}`,
    `- LinkedIn: ${profile.linkedinUrl}`,
    '',
  ].join('\n')
}
