export type ProjectLinkEmphasis = 'primary' | 'secondary'

interface ProjectLinkKindSpec {
  labelKey: string
  emphasis: ProjectLinkEmphasis
}

// One entry per kind of project link. Adding a kind (e.g. an App Store link) means one
// entry here, its i18n key in shared/config/i18n.ts, its twin label in
// tooling/agent-files/labels.ts and its icon in ProjectCard; tests fail until all exist.
export const PROJECT_LINK_KINDS = {
  site: { labelKey: 'projects.links.site', emphasis: 'primary' },
  download: { labelKey: 'projects.links.download', emphasis: 'primary' },
  googlePlay: { labelKey: 'projects.links.googlePlay', emphasis: 'primary' },
  microsoftStore: { labelKey: 'projects.links.microsoftStore', emphasis: 'primary' },
  repository: { labelKey: 'projects.links.repository', emphasis: 'secondary' },
  documentation: { labelKey: 'projects.links.documentation', emphasis: 'secondary' },
} as const satisfies Record<string, ProjectLinkKindSpec>

export type ProjectLinkKind = keyof typeof PROJECT_LINK_KINDS

export interface ProjectLink {
  kind: ProjectLinkKind
  url: string
}

const isProjectLinkKind = (value: string): value is ProjectLinkKind => Object.keys(PROJECT_LINK_KINDS).includes(value)

// The JSON types every link kind as a plain string; this narrows it at the data boundary.
export const toProjectLinkKind = (value: string): ProjectLinkKind => {
  if (!isProjectLinkKind(value)) throw new Error(`Unknown project link kind in the project data: ${value}`)
  return value
}

export const isPrimaryLink = (link: ProjectLink): boolean => PROJECT_LINK_KINDS[link.kind].emphasis === 'primary'
