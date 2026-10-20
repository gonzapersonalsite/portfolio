import React from 'react'
import { Box, Typography, Button, Container, Stack } from '@mui/material'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import { DEFAULT_LANGUAGE, i18n, localizedPath, toSupportedLanguage } from '@/shared/config'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

// The fallback replaces the whole router, layout included, so it brings its own <main> and <h1>
// and a way out that does not depend on the broken tree: a plain link to the home page.
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container component="main" maxWidth="sm" sx={{ py: 12 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              textAlign: 'center',
            }}
          >
            <ErrorOutlinedIcon aria-hidden="true" sx={{ fontSize: 80, color: 'error.main' }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              {i18n.t('common.errorBoundaryTitle')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {i18n.t('common.errorBoundaryDescription')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button variant="contained" color="primary" size="large" onClick={() => window.location.reload()}>
                {i18n.t('common.errorBoundaryRefresh')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                href={localizedPath('/', toSupportedLanguage(i18n.resolvedLanguage) ?? DEFAULT_LANGUAGE)}
              >
                {i18n.t('common.errorBoundaryHome')}
              </Button>
            </Stack>
          </Box>
        </Container>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
