import type { ProjectLink } from './projectLinks.ts'

export interface ProjectImage {
  // Path without the variant suffix; the files are `<base>-thumb.webp`, `<base>-800.webp`
  // and `<base>-full.webp` (see projectImages.ts).
  base: string
  // Intrinsic width of the -full file, so the cover can offer it in its srcset.
  fullWidth: number
  altEn: string
  altEs: string
}

export interface Project {
  id: string
  titleEn: string
  titleEs: string
  descriptionEn: string
  descriptionEs: string
  technologies: string[]
  images: ProjectImage[]
  links: ProjectLink[]
  type: 'WEB' | 'DESKTOP' | 'MOBILE' | 'OTHER'
  featured: boolean
  order: number
}
