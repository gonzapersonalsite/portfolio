import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import type { Project } from '../model/types'
import { PROJECT_LINK_KINDS } from '../model/projectLinks'
import {
  PROJECT_COVER_RATIO,
  PROJECT_IMAGE_VARIANT_WIDTH,
  projectImageUrl,
  type ProjectImageVariant,
} from '../model/projectImages'
import data from './data.json'

const projects = data as Project[]
const publicImages = new Set(Object.keys(import.meta.glob('/public/images/**/*')))
const VARIANTS: readonly ProjectImageVariant[] = ['thumb', 'card', 'full']
const MAX_ALT_LENGTH = 250

// Size from the WebP header: lossy (VP8), lossless (VP8L) and extended (VP8X) files.
const webpSize = (url: string): { width: number; height: number } => {
  const bytes = readFileSync(resolve(import.meta.dirname, `../../../../public${url}`))
  const format = bytes.toString('ascii', 12, 16)
  if (format === 'VP8 ') return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff }
  if (format === 'VP8L') {
    const bits = bytes.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
  }
  if (format === 'VP8X') return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 }
  throw new Error(`not a WebP file: ${url}`)
}
const webpWidth = (url: string): number => webpSize(url).width

describe('static project content', () => {
  it('has at least one project', () => {
    expect(projects.length).toBeGreaterThan(0)
  })

  it('satisfies the field contract', () => {
    for (const project of projects) {
      expect(project.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(project.titleEn.length).toBeGreaterThan(0)
      expect(project.titleEs.length).toBeGreaterThan(0)
      expect(project.descriptionEn.length).toBeGreaterThan(0)
      expect(project.descriptionEs.length).toBeGreaterThan(0)
      expect(project.technologies.length).toBeGreaterThan(0)
      expect(['WEB', 'DESKTOP', 'MOBILE', 'OTHER']).toContain(project.type)
      expect(typeof project.featured).toBe('boolean')
      expect(typeof project.order).toBe('number')
    }
  })

  it('lists every technology once per project', () => {
    for (const project of projects) {
      expect(new Set(project.technologies).size, `duplicate technology in ${project.id}`).toBe(
        project.technologies.length,
      )
    }
  })

  it('keeps each image in the project folder, numbered by its gallery position', () => {
    for (const project of projects) {
      expect(project.images.length, `no images: ${project.id}`).toBeGreaterThan(0)
      project.images.forEach((image, index) => {
        const position = String(index).padStart(2, '0')
        expect(image.base, project.id).toMatch(new RegExp(`^/images/projects/${project.id}/${position}-[\\w-]+$`))
      })
    }
  })

  it('ships the thumb, card and full variant of every image', () => {
    for (const project of projects) {
      for (const image of project.images) {
        for (const variant of VARIANTS) {
          const url = projectImageUrl(image, variant)
          expect(publicImages.has(`/public${url}`), `missing on disk: ${url}`).toBe(true)
        }
      }
    }
  })

  it('ships no project image that no project shows', () => {
    const shown = new Set(
      projects.flatMap((project) =>
        project.images.flatMap((image) => VARIANTS.map((variant) => `/public${projectImageUrl(image, variant)}`)),
      ),
    )
    const shipped = [...publicImages].filter((path) => path.startsWith('/public/images/projects/'))
    expect(shipped.filter((path) => !shown.has(path))).toEqual([])
  })

  it('records the real width of each image and never upscales a variant', () => {
    for (const project of projects) {
      for (const image of project.images) {
        expect(webpWidth(projectImageUrl(image, 'full')), image.base).toBe(image.fullWidth)
        expect(webpWidth(projectImageUrl(image, 'card')), image.base).toBe(
          Math.min(PROJECT_IMAGE_VARIANT_WIDTH.card, image.fullWidth),
        )
        expect(webpWidth(projectImageUrl(image, 'thumb')), image.base).toBe(
          Math.min(PROJECT_IMAGE_VARIANT_WIDTH.thumb, image.fullWidth),
        )
      }
    }
  })

  it('composes every cover at the card ratio, so the card never crops it', () => {
    for (const project of projects) {
      const cover = project.images[0]
      for (const variant of VARIANTS) {
        const { width, height } = webpSize(projectImageUrl(cover, variant))
        expect(width * PROJECT_COVER_RATIO.height, `${cover.base} ${variant}: ${width}x${height}`).toBe(
          height * PROJECT_COVER_RATIO.width,
        )
      }
    }
  })

  it('describes every image in both languages', () => {
    for (const project of projects) {
      for (const image of project.images) {
        for (const alt of [image.altEn, image.altEs]) {
          expect(alt.trim().length, image.base).toBeGreaterThan(0)
          expect(alt.length, `alt too long: ${image.base}`).toBeLessThanOrEqual(MAX_ALT_LENGTH)
        }
        expect(image.altEn, image.base).not.toBe(image.altEs)
      }
    }
  })

  it('only links known kinds over https, each address once per project', () => {
    for (const project of projects) {
      for (const link of project.links) {
        expect(Object.keys(PROJECT_LINK_KINDS), `${project.id}: ${link.kind}`).toContain(link.kind)
        expect(new URL(link.url).protocol, link.url).toBe('https:')
      }
      const urls = project.links.map((link) => link.url)
      expect(new Set(urls).size, `duplicate link in ${project.id}`).toBe(urls.length)
    }
  })

  it('is sorted by ascending order', () => {
    const orders = projects.map((p) => p.order)
    const sorted = [...orders].sort((a, b) => a - b)
    expect(orders).toEqual(sorted)
  })

  it('has no duplicate ids', () => {
    const ids = projects.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
