import React from 'react'
import { Typography, Box, List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import CircleIcon from '@mui/icons-material/Circle'
import { normalizeRichText, parseBulletLine } from '@/shared/lib'

interface RichTextRendererProps {
  text: string
  variant?: 'body1' | 'body2' | 'caption' | 'subtitle1' | 'subtitle2'
}

const RichTextRenderer: React.FC<RichTextRendererProps> = ({ text, variant = 'body1' }) => {
  if (!text) return null

  const normalizedText = normalizeRichText(text)

  const lines = normalizedText.split(/\r?\n/)

  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  const isSmallText = variant === 'body2' || variant === 'caption' || variant === 'subtitle2'
  const bulletMt = isSmallText ? '7px' : '10px'

  const flushList = (keyIndex: number) => {
    if (currentList.length > 0) {
      elements.push(
        <List key={`list-${keyIndex}`} dense sx={{ py: 0, my: 1, pl: 2 }}>
          {currentList.map((item, i) => (
            <ListItem key={i} alignItems="flex-start" sx={{ py: 0, pl: 0 }}>
              <ListItemIcon sx={{ minWidth: 24, mt: bulletMt }}>
                <CircleIcon sx={{ fontSize: 6, color: 'text.secondary' }} />
              </ListItemIcon>
              <ListItemText
                primary={item}
                slotProps={{
                  primary: {
                    variant: variant,
                    color: 'text.secondary',
                    sx: { lineHeight: 1.6 },
                  },
                }}
                sx={{ m: 0 }}
              />
            </ListItem>
          ))}
        </List>,
      )
      currentList = []
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const bullet = parseBulletLine(trimmed)

    if (bullet !== null) {
      currentList.push(bullet)
    } else {
      flushList(index)

      if (!trimmed) {
        if (lines.length > 1 && index > 0 && lines[index - 1].trim() !== '') {
          elements.push(<Box key={`spacer-${index}`} sx={{ height: 8 }} />)
        }
      } else {
        elements.push(
          <Typography key={`text-${index}`} variant={variant} color="text.secondary" sx={{ mb: 1, lineHeight: 1.6 }}>
            {line}
          </Typography>,
        )
      }
    }
  })

  flushList(lines.length)

  return <Box>{elements}</Box>
}

export default RichTextRenderer
