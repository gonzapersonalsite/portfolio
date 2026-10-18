export function getLocalizedText(language: string, en?: string, es?: string): string {
  return language === 'en' ? en || es || '' : es || en || ''
}
