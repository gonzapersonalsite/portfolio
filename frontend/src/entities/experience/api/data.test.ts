import { describe, it, expect } from 'vitest'
import data from './data.json'

describe('static experience content', () => {
  it('has at least one experience', () => {
    expect(data.length).toBeGreaterThan(0)
  })

  it('satisfies the field contract and date format', () => {
    for (const exp of data) {
      expect(exp.companyEn.length).toBeGreaterThan(0)
      expect(exp.companyEs.length).toBeGreaterThan(0)
      expect(exp.positionEn.length).toBeGreaterThan(0)
      expect(exp.positionEs.length).toBeGreaterThan(0)
      expect(exp.descriptionEn.length).toBeGreaterThan(0)
      expect(exp.descriptionEs.length).toBeGreaterThan(0)
      expect(exp.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      if (exp.endDate) {
        expect(exp.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
      expect(Array.isArray(exp.technologies)).toBe(true)
    }
  })

  // Technologies are shown as-is in both languages, so they hold names only;
  // a duplicate would render the same chip twice.
  it('lists each technology once per entry', () => {
    for (const exp of data) {
      expect(new Set(exp.technologies).size, `duplicate technology in ${exp.id}`).toBe(exp.technologies.length)
    }
  })

  it('is sorted by endDate DESC (open-ended first), then startDate DESC', () => {
    const keys = data.map((e) => ({ e: e.endDate ?? '9999-12-31', s: e.startDate }))
    const sorted = [...keys].sort((a, b) => (a.e !== b.e ? b.e.localeCompare(a.e) : b.s.localeCompare(a.s)))
    expect(keys).toEqual(sorted)
  })
})
