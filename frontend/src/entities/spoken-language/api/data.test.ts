import { describe, it, expect } from 'vitest'
import data from './data.json'

describe('static spoken-language content', () => {
  it('has at least one language', () => {
    expect(data.length).toBeGreaterThan(0)
  })

  it('satisfies the field contract', () => {
    for (const lang of data) {
      expect(lang.nameEn.length).toBeGreaterThan(0)
      expect(lang.nameEs.length).toBeGreaterThan(0)
      expect(lang.levelEn.length).toBeGreaterThan(0)
      expect(lang.levelEs.length).toBeGreaterThan(0)
      expect(typeof lang.order).toBe('number')
    }
  })

  it('is sorted by ascending order', () => {
    const orders = data.map((l) => l.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})
