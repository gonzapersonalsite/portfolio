import { describe, expect, it } from 'vitest'
import { formatMonthYear, formatPeriod } from './localeFormat'

describe('formatMonthYear', () => {
  it('writes the short month and the year in each language', () => {
    expect(formatMonthYear('2025-03-24', 'en')).toBe('Mar 2025')
    expect(formatMonthYear('2025-03-24', 'es')).toBe('mar 2025')
  })

  it('keeps the month of the 1st whatever the time zone', () => {
    // Parsed as local midnight, 2026-06-01 would read as May in any time zone west of UTC.
    expect(formatMonthYear('2026-06-01', 'en')).toBe('Jun 2026')
    expect(formatMonthYear('2026-01-01', 'es')).toBe('ene 2026')
  })
})

describe('formatPeriod', () => {
  it('joins both ends with an en dash', () => {
    expect(formatPeriod('2025-03-24', '2025-06-16', 'en', 'Present')).toBe('Mar 2025 – Jun 2025')
  })

  it('ends an open period with the present label', () => {
    expect(formatPeriod('2026-06-10', undefined, 'es', 'Actualidad')).toBe('jun 2026 – Actualidad')
  })
})
