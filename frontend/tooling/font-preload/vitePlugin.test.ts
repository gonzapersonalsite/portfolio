import { describe, expect, it } from 'vitest'
import { fontPreloadTags } from './vitePlugin'

describe('fontPreloadTags', () => {
  it('preloads the Inter latin file, and only that subset, as a CORS font', () => {
    const tags = fontPreloadTags([
      'assets/index-a1B2.js',
      'assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2',
      'assets/inter-latin-wght-normal-Dx4kXJAl.woff2',
      'assets/inter-greek-wght-normal-CkhJZR-_.woff2',
    ])

    expect(tags).toEqual([
      {
        tag: 'link',
        attrs: {
          rel: 'preload',
          href: '/assets/inter-latin-wght-normal-Dx4kXJAl.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: true,
        },
        injectTo: 'head',
      },
    ])
  })

  it('fails the build when the font is missing, instead of shipping pages without the preload', () => {
    expect(() =>
      fontPreloadTags(['assets/index-a1B2.js', 'assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2']),
    ).toThrow(/font-preload/)
  })
})
