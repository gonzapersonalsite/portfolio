// Dates and numbers written the way each UI language expects. The markdown twins use the same
// functions, so the page and its twin never disagree.

const localeOf = (language: string): string => (language === 'en' ? 'en-US' : 'es-ES')

// Content dates are ISO calendar dates (YYYY-MM-DD). They are read and formatted in UTC so the
// month never shifts with the visitor's time zone (the 1st must not become the previous month).
export function formatMonthYear(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(localeOf(language), { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  )
}

// An open-ended period ends with `presentLabel` ('Present' / 'Actualidad').
export function formatPeriod(
  startDate: string,
  endDate: string | undefined,
  language: string,
  presentLabel: string,
): string {
  const end = endDate === undefined ? presentLabel : formatMonthYear(endDate, language)
  return `${formatMonthYear(startDate, language)} – ${end}`
}

// '80%' in English, '80 %' (non-breaking space) in Spanish.
export function formatPercent(value: number, language: string): string {
  return new Intl.NumberFormat(localeOf(language), { style: 'percent' }).format(value / 100)
}
