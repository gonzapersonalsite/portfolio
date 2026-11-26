import type { ProjectLink } from './projectLinks.ts'

export const PROJECT_TYPES = ['WEB', 'DESKTOP', 'MOBILE', 'OTHER'] as const

export type ProjectType = (typeof PROJECT_TYPES)[number]

// The JSON types every project type as a plain string; this narrows it at the data boundary.
export const toProjectType = (value: string): ProjectType => {
  const type = PROJECT_TYPES.find((known) => known === value)
  if (type === undefined) throw new Error(`Unknown project type in the project data: ${value}`)
  return type
}

export interface ProjectImage {
  // Path without the variant suffix; the files are `<base>-thumb.webp`, `<base>-800.webp`
  // and `<base>-full.webp` (see projectImages.ts).
  base: string
  // Intrinsic width of the -full file, so the cover can offer it in its srcset.
  fullWidth: number
  altEn: string
  altEs: string
}

export interface ProjectArchitectureSpec {
  label: string
  detail: string
}

export interface Project {
  id: string
  titleEn: string
  titleEs: string
  descriptionEn: string
  descriptionEs: string
  architectureEn: ProjectArchitectureSpec[]
  architectureEs: ProjectArchitectureSpec[]
  technologies: string[]
  images: ProjectImage[]
  links: ProjectLink[]
  type: ProjectType
  featured: boolean
  order: number
}
