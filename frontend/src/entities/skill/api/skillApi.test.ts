import { describe, expect, it } from 'vitest'
import { getAllSkills, getCoreSkills, getSkillGroups } from './skillApi'
import { CORE_SKILL_CATEGORIES, CORE_SKILL_LEVEL, SKILL_CATEGORY_ORDER } from '../model/categories'

describe('getSkillGroups', () => {
  it('lists every skill once, grouped in the display order of the categories', () => {
    const groups = getSkillGroups()
    const categories = groups.map((group) => group.category)

    expect(categories).toEqual(SKILL_CATEGORY_ORDER.filter((category) => categories.includes(category)))
    expect(groups.flatMap((group) => group.skills)).toHaveLength(getAllSkills().length)
    expect(groups.every((group) => group.skills.length > 0)).toBe(true)
  })

  it('puts the development stacks before infrastructure and general skills', () => {
    const categories = getSkillGroups().map((group) => group.category)

    expect(categories.slice(0, 4)).toEqual(['Frontend', 'Backend', 'Mobile', 'Desktop'])
  })
})

describe('getCoreSkills', () => {
  it('keeps only development skills at the core level or above', () => {
    const core = getCoreSkills()

    expect(core.length).toBeGreaterThan(0)
    for (const skill of core) {
      expect(CORE_SKILL_CATEGORIES.has(skill.category), skill.nameEn).toBe(true)
      expect(skill.level).toBeGreaterThanOrEqual(CORE_SKILL_LEVEL)
    }
  })

  it('leaves out infrastructure skills however high their level', () => {
    const names = getCoreSkills().map((skill) => skill.nameEn)

    expect(names).toContain('React')
    expect(names).toContain('Flutter')
    expect(names).not.toContain('Windows')
    expect(names).not.toContain('Hardware repair')
  })
})
