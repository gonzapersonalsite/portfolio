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
  repository: { labelKey: 'projects.links.repository', emphasis: 'secondary' },
  documentation: { labelKey: 'projects.links.documentation', emphasis: 'secondary' },
} as const satisfies Record<string, ProjectLinkKindSpec>

export type ProjectLinkKind = keyof typeof PROJECT_LINK_KINDS

export interface ProjectLink {
  kind: ProjectLinkKind
  url: string
}

export const isPrimaryLink = (link: ProjectLink): boolean => PROJECT_LINK_KINDS[link.kind].emphasis === 'primary'
