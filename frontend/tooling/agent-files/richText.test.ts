import { describe, expect, it } from 'vitest'
import { richTextToBlocks } from './richText'

describe('richTextToBlocks', () => {
  it('turns literal backslash-n sequences into separate blocks', () => {
    expect(richTextToBlocks('First\\nSecond')).toEqual(['First', 'Second'])
  })

  it('groups consecutive bullet lines into a tight markdown list', () => {
    expect(richTextToBlocks('Tasks:\\n\\n● First\\n● Second')).toEqual(['Tasks:', '- First\n- Second'])
  })

  it('keeps real newlines and ignores blank lines', () => {
    expect(richTextToBlocks('One\n\nTwo')).toEqual(['One', 'Two'])
  })
})
