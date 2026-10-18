// The production address. Canonical links, social previews and the build-time agent files
// (tooling/agent-files) are all absolute URLs on it.
export const SITE_URL = 'https://mi-portafolio-gonzalo.vercel.app'

export const absoluteUrl = (path: string): string => `${SITE_URL}${path}`
