import type { Project, ProjectImage } from './types.ts'

export type ProjectImageVariant = 'thumb' | 'card' | 'full'

// Maximum width of the resized variants; a source narrower than that is copied, never upscaled.
export const PROJECT_IMAGE_VARIANT_WIDTH = { thumb: 160, card: 800 } as const

// The card shows its cover at this ratio and crops anything else, so covers are composed at it.
export const PROJECT_COVER_RATIO = { width: 16, height: 9 } as const

const VARIANT_SUFFIX: Record<ProjectImageVariant, string> = {
  thumb: 'thumb',
  card: String(PROJECT_IMAGE_VARIANT_WIDTH.card),
  full: 'full',
}

export const projectImageUrl = (image: ProjectImage, variant: ProjectImageVariant): string =>
  `${image.base}-${VARIANT_SUFFIX[variant]}.webp`

export interface ImageSources {
  src: string
  srcSet?: string
  sizes?: string
}

// Rendered width of a card in the xs=12 / md=6 / lg=4 grid that lists projects inside a
// Container lg (ProjectsPage and the Home featured section).
const COVER_SIZES = '(min-width: 1200px) 364px, (min-width: 900px) 50vw, 100vw'

// The route shell preloads these exact sources, so the preload and the <img> always match.
export const projectCoverSources = (project: Project): ImageSources => {
  const cover = project.images[0]
  const src = projectImageUrl(cover, 'card')
  const cardWidth = PROJECT_IMAGE_VARIANT_WIDTH.card
  if (cover.fullWidth <= cardWidth) {
    // The card file already is the whole image: there is nothing larger to offer.
    return { src }
  }

  return {
    src,
    srcSet: `${src} ${cardWidth}w, ${projectImageUrl(cover, 'full')} ${cover.fullWidth}w`,
    sizes: COVER_SIZES,
  }
}
