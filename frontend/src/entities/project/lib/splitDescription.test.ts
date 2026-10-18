import { describe, expect, it } from 'vitest'
import data from '../api/data.json'
import { splitDescription } from './splitDescription'

describe('splitDescription', () => {
  it('splits the first paragraph from the rest, with literal or real line breaks', () => {
    expect(splitDescription('First.\\n\\nSecond.\\n\\nThird.')).toEqual({ lead: 'First.', rest: 'Second.\n\nThird.' })
    expect(splitDescription('First.\n\nSecond.')).toEqual({ lead: 'First.', rest: 'Second.' })
  })

  it('keeps single line breaks and bullet lists inside the paragraph they belong to', () => {
    expect(splitDescription('Intro:\n- one\n- two\n\nOutro.')).toEqual({ lead: 'Intro:\n- one\n- two', rest: 'Outro.' })
  })

  it('returns an empty rest for a single paragraph', () => {
    expect(splitDescription('  Only one.  ')).toEqual({ lead: 'Only one.', rest: '' })
    expect(splitDescription('')).toEqual({ lead: '', rest: '' })
  })

  it('gives every project a lead paragraph and more to read in both languages', () => {
    for (const project of data) {
      for (const description of [project.descriptionEn, project.descriptionEs]) {
        const { lead, rest } = splitDescription(description)
        expect(lead.length, project.id).toBeGreaterThan(0)
        expect(rest.length, project.id).toBeGreaterThan(0)
      }
    }
  })
})
