// Content JSON stores line breaks as literal "\n" sequences in some entities and as real
// newlines in others, and bullet markers sometimes follow text on the same line. The UI
// (RichTextRenderer) and the agent markdown twins read text only through these two functions.

// '-' and '*' start a bullet only at the beginning of a line; the dedicated glyphs anywhere.
const BULLET_LINE = /^[●•*◦▪-]\s*(.*)$/
const INLINE_BULLET = /([^\n])\s+([●•◦▪])/g

export function normalizeRichText(text: string): string {
  return text.replace(/\\n/g, '\n').replace(INLINE_BULLET, '$1\n$2')
}

// The text of a bullet line without its marker, or null when the line is a paragraph.
export function parseBulletLine(line: string): string | null {
  return line.trim().match(BULLET_LINE)?.[1] ?? null
}
