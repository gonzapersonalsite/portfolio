import { describe, expect, it } from 'vitest'
import { PROJECT_LINK_KINDS, toProjectLinkKind } from './projectLinks'
import { PROJECT_TYPES, toProjectType } from './types'

describe('toProjectType', () => {
  it.each(PROJECT_TYPES)('accepts the known type %s', (type) => {
    expect(toProjectType(type)).toBe(type)
  })

  it.each(['web', 'GAME', ''])('rejects the unknown type "%s"', (value) => {
    expect(() => toProjectType(value)).toThrow(`Unknown project type in the project data: ${value}`)
  })
})

describe('toProjectLinkKind', () => {
  it.each(Object.keys(PROJECT_LINK_KINDS))('accepts the registered kind %s', (kind) => {
    expect(toProjectLinkKind(kind)).toBe(kind)
  })

  it.each(['appStore', 'toString', ''])('rejects the unregistered kind "%s"', (value) => {
    expect(() => toProjectLinkKind(value)).toThrow(`Unknown project link kind in the project data: ${value}`)
  })
})
