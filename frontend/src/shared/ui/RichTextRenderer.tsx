import React from 'react'
import { normalizeRichText, parseBulletLine } from '@/shared/lib'
import { DotIcon } from './Icons'
import './RichTextRenderer.css'

export interface RichTextRendererProps {
  readonly text: string
  readonly variant?: 'body1' | 'body2'
  readonly className?: string
}

type Block = { readonly type: 'list'; readonly items: string[] } | { readonly type: 'paragraph'; readonly text: string }

const groupBlocks = (text: string): Block[] => {
  const lines = normalizeRichText(text).split('\n')
  const blocks: Block[] = []

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue

    const bullet = parseBulletLine(trimmed)
    if (bullet !== null) {
      const last = blocks[blocks.length - 1]
      if (last?.type === 'list') {
        last.items.push(bullet)
      } else {
        blocks.push({ type: 'list', items: [bullet] })
      }
      continue
    }

    blocks.push({ type: 'paragraph', text: trimmed })
  }

  return blocks
}

const RichTextRenderer: React.FC<RichTextRendererProps> = ({ text, variant = 'body1', className }) => {
  if (!text) return null

  const blocks = groupBlocks(text)

  return (
    <div className={className ? `rich-text rich-text--${variant} ${className}` : `rich-text rich-text--${variant}`}>
      {blocks.map((block, blockIndex) =>
        block.type === 'list' ? (
          <ul key={blockIndex} className="rich-text__list">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="rich-text__item">
                <span className="rich-text__bullet">
                  <DotIcon className="rich-text__bullet-icon" />
                </span>
                <span className="rich-text__item-text">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={blockIndex} className="rich-text__paragraph">
            {block.text}
          </p>
        ),
      )}
    </div>
  )
}

export default RichTextRenderer
