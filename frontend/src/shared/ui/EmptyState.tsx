import React from 'react'
import { Box, Typography } from '@mui/material'
import type { SvgIconProps } from '@mui/material'
import { useTheme } from '@mui/material/styles'

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactElement<SvgIconProps>
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon }) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 6,
        borderRadius: 4,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
        border: `1px dashed ${theme.palette.divider}`,
        width: '100%',
        my: 4,
      }}
    >
      {icon && (
        <Box
          sx={{
            mb: 2,
            p: 2,
            borderRadius: '50%',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {React.cloneElement(icon, { fontSize: 'large' })}
        </Box>
      )}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500 }}>
        {description}
      </Typography>
    </Box>
  )
}

export default EmptyState
