import type { HtmlTagDescriptor, Plugin } from 'vite'

// Inter's latin subset (Spanish accents included) is the only font file the pages download.
const INTER_LATIN = /(^|\/)inter-latin-wght-normal-[\w-]+\.woff2$/

// The font is otherwise requested only once React paints text, after all the JavaScript has run;
// with font-display: swap the text then reflows (layout shift on slow connections).
// crossorigin is required: a font preload without it is downloaded twice.
export const fontPreloadTags = (bundleFileNames: readonly string[]): HtmlTagDescriptor[] => {
  const font = bundleFileNames.find((fileName) => INTER_LATIN.test(fileName))
  if (font === undefined) {
    throw new Error('font-preload: the Inter latin woff2 file is not in the bundle')
  }

  return [
    {
      tag: 'link',
      attrs: { rel: 'preload', href: `/${font}`, as: 'font', type: 'font/woff2', crossorigin: true },
      injectTo: 'head',
    },
  ]
}

// Runs before the agent-files plugin copies index.html into the route shells, so every page
// inherits the preload.
export function fontPreloadPlugin(): Plugin {
  return {
    name: 'portfolio-font-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (_html, context) => fontPreloadTags(Object.keys(context.bundle ?? {})),
    },
  }
}
