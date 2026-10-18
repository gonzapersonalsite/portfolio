import { describe, it, expect } from 'vitest'
import data from './data.json'
import { SKILL_CATEGORY_ORDER } from '../model/categories'

describe('static skill content', () => {
  it('has skills across several categories', () => {
    expect(data.length).toBeGreaterThan(0)
    expect(new Set(data.map((s) => s.category)).size).toBeGreaterThan(1)
  })

  it('satisfies the field contract', () => {
    for (const skill of data) {
      expect(skill.nameEn.length).toBeGreaterThan(0)
      expect(skill.nameEs.length).toBeGreaterThan(0)
      expect(skill.level).toBeGreaterThanOrEqual(0)
      expect(skill.level).toBeLessThanOrEqual(100)
      expect(SKILL_CATEGORY_ORDER, `${skill.nameEn}: unknown category ${skill.category}`).toContain(skill.category)
      expect(typeof skill.order).toBe('number')
    }
  })

  it('is sorted by ascending order', () => {
    const orders = data.map((s) => s.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})
