import { describe, it, expect } from 'vitest'
import data from './data.json'

const publicImages = new Set(Object.keys(import.meta.glob('/public/images/**/*')))

// The pages render these pairs with no fallback text, so an empty side would
// leave a blank heading or paragraph in that language.
const BILINGUAL_FIELDS = [
  'greeting',
  'subtitle',
  'description',
  'aboutTitle',
  'aboutIntroTitle',
  'aboutSummary',
  'aboutPhilosophy',
  'sentence',
  'fullName',
  'location',
] as const

const LINK_FIELDS = ['cvUrl', 'githubUrl', 'linkedinUrl'] as const

describe('static profile content', () => {
  it('the image is local and exists in public/', () => {
    expect(data.imageUrl.startsWith('/images/'), `external image: ${data.imageUrl}`).toBe(true)
    expect(publicImages.has(`/public${data.imageUrl}`), `missing on disk: ${data.imageUrl}`).toBe(true)
  })

  it('satisfies the essential field contract', () => {
    expect(data.id).toBe('profile')
    expect(data.email).toContain('@')
    expect(data.alternateName.length).toBeGreaterThan(0)
    expect(data.logoText.length).toBeGreaterThan(0)
  })

  it.each(BILINGUAL_FIELDS)('fills both languages of %s', (field) => {
    expect(data[`${field}En`].trim().length, `${field}En is empty`).toBeGreaterThan(0)
    expect(data[`${field}Es`].trim().length, `${field}Es is empty`).toBeGreaterThan(0)
  })

  it.each(LINK_FIELDS)('serves %s over https', (field) => {
    expect(data[field].startsWith('https://'), `${field}: ${data[field]}`).toBe(true)
  })
})
