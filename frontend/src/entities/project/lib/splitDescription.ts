import { normalizeRichText } from '@/shared/lib'

export interface SplitDescription {
  lead: string
  rest: string
}

// Cards show the first paragraph and reveal the rest on demand.
export const splitDescription = (text: string): SplitDescription => {
  const [lead = '', ...rest] = normalizeRichText(text)
    .trim()
    .split(/\n\s*\n/)
  return { lead: lead.trim(), rest: rest.join('\n\n').trim() }
}
