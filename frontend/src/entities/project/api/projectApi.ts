import projectsData from './data.json' with { type: 'json' }
import { toProjectLinkKind } from '../model/projectLinks.ts'
import { toProjectType, type Project } from '../model/types.ts'

const projects: Project[] = projectsData.map((project) => ({
  ...project,
  type: toProjectType(project.type),
  links: project.links.map((link) => ({ ...link, kind: toProjectLinkKind(link.kind) })),
}))

export const getAllProjects = (): Project[] => projects

export const getFeaturedProjects = (): Project[] => projects.filter((p) => p.featured)
