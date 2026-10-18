import projectsData from './data.json' with { type: 'json' }
import type { Project } from '../model/types.ts'

const projects = projectsData as Project[]

export const getAllProjects = (): Project[] => projects

export const getFeaturedProjects = (): Project[] => projects.filter((p) => p.featured)
