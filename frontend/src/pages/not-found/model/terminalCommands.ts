export type TerminalRoutePath = '/' | '/about' | '/skills' | '/experience' | '/projects' | '/contact'

export type TerminalOutputType = 'help' | 'ls' | 'pwd' | 'whoami' | 'cdNotFound' | 'unknown'

export type TerminalCommandResult =
  | { readonly kind: 'noop' }
  | { readonly kind: 'clear' }
  | { readonly kind: 'navigate'; readonly routePath: TerminalRoutePath }
  | {
      readonly kind: 'output'
      readonly outputType: TerminalOutputType
      readonly detail?: string
    }

export const MAX_COMMAND_LENGTH = 80
export const MAX_TERMINAL_HISTORY = 25

export const TERMINAL_QUICK_COMMANDS = ['help', 'ls', 'cd ~', 'cd projects', 'clear'] as const

const DIRECT_ROUTE_ALIASES: Readonly<Record<string, TerminalRoutePath>> = {
  '~': '/',
  '/': '/',
  '..': '/',
  '../..': '/',
  home: '/',
  inicio: '/',
  exit: '/',
  projects: '/projects',
  proyectos: '/projects',
  about: '/about',
  'sobre-mi': '/about',
  skills: '/skills',
  habilidades: '/skills',
  experience: '/experience',
  experiencia: '/experience',
  contact: '/contact',
  contacto: '/contact',
}

const AUTOCOMPLETE_CANDIDATES = [
  'help',
  'ls',
  'pwd',
  'whoami',
  'clear',
  'cd ~',
  'cd projects',
  'cd about',
  'cd skills',
  'cd experience',
  'cd contact',
] as const

const normalizeCdTarget = (rawTarget: string): string => {
  const trimmed = rawTarget
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .toLowerCase()
  if (trimmed === '' || trimmed === '~' || trimmed === '/' || trimmed === '..' || trimmed === '../..') {
    return trimmed === '' ? '~' : trimmed
  }
  return trimmed
    .replace(/^(?:~\/|\.\/|\/)+/, '')
    .replace(/^en\//, '')
    .replace(/^home\//, '')
    .replace(/\/+$/, '')
}

export const resolveTerminalCommand = (rawInput: string): TerminalCommandResult => {
  const trimmed = rawInput.slice(0, MAX_COMMAND_LENGTH).trim()
  if (trimmed.length === 0) {
    return { kind: 'noop' }
  }

  const tokens = trimmed.split(/\s+/)
  const cmd = tokens[0].toLowerCase()
  const rest = trimmed.slice(tokens[0].length).trim()

  if (cmd === 'clear' || cmd === 'cls' || cmd === 'reset') {
    return { kind: 'clear' }
  }

  if (cmd === 'help' || cmd === '--help' || cmd === '-h' || cmd === 'man' || cmd === '?') {
    return { kind: 'output', outputType: 'help' }
  }

  if (cmd === 'ls' || cmd === 'll' || cmd === 'dir') {
    return { kind: 'output', outputType: 'ls' }
  }

  if (cmd === 'pwd') {
    return { kind: 'output', outputType: 'pwd' }
  }

  if (cmd === 'whoami' || cmd === 'id') {
    return { kind: 'output', outputType: 'whoami' }
  }

  if (cmd === 'cd' || cmd === 'open' || cmd === 'goto') {
    const normalizedTarget = normalizeCdTarget(rest)
    const matchedRoute = DIRECT_ROUTE_ALIASES[normalizedTarget]
    if (matchedRoute) {
      return { kind: 'navigate', routePath: matchedRoute }
    }
    return {
      kind: 'output',
      outputType: 'cdNotFound',
      detail: rest.trim(),
    }
  }

  const directAliasTarget = normalizeCdTarget(trimmed)
  const directRoute = DIRECT_ROUTE_ALIASES[directAliasTarget]
  if (directRoute && tokens.length === 1) {
    return { kind: 'navigate', routePath: directRoute }
  }

  return {
    kind: 'output',
    outputType: 'unknown',
    detail: tokens[0],
  }
}

export const autocompleteTerminalCommand = (rawInput: string): string | null => {
  const normalized = rawInput.trimStart().toLowerCase()
  if (normalized.length === 0) return null

  const match = AUTOCOMPLETE_CANDIDATES.find(
    (candidate) => candidate.startsWith(normalized) && candidate !== normalized,
  )
  return match ?? null
}
