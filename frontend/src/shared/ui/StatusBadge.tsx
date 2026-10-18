import React from 'react'
import { Chip } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { keyframes } from '@emotion/react'

const statusPulse = keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
`

interface StatusBadgeProps {
  label: string
}

// A positive status shown next to a heading, such as "Open to work". The solid surface keeps
// the text readable on top of gradients.
const StatusBadge: React.FC<StatusBadgeProps> = ({ label }) => (
  <Chip
    label={label}
    icon={
      <FiberManualRecordIcon
        aria-hidden="true"
        sx={{
          fontSize: 12,
          // Only the dot moves; the appearance control can pause it without JavaScript timers.
          '@media (prefers-reduced-motion: no-preference)': {
            animation: `${statusPulse} 2.4s ease-in-out infinite`,
            animationPlayState: 'var(--decorative-animation-state, paused)',
          },
          '@media print': { animation: 'none' },
        }}
      />
    }
    color="success"
    variant="outlined"
    sx={{
      // background.paper is translucent in glass; status needs an opaque surface in every mode.
      bgcolor: (theme) => (theme.palette.mode === 'light' ? '#edf7ed' : '#10261b'),
      fontWeight: 600,
      '& .MuiChip-icon': { ml: 1 },
    }}
  />
)

export default StatusBadge
