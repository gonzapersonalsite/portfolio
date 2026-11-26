import { describe, expect, it } from 'vitest'
import { SKILL_CATEGORY_ORDER, toSkillCategory } from './categories'

describe('toSkillCategory', () => {
  it.each(SKILL_CATEGORY_ORDER)('accepts the known category %s', (category) => {
    expect(toSkillCategory(category)).toBe(category)
  })

  it.each(['frontend', 'DevOps', ''])('rejects the unknown category "%s" instead of rendering it', (value) => {
    expect(() => toSkillCategory(value)).toThrow(`Unknown skill category in the skill data: ${value}`)
  })
})
