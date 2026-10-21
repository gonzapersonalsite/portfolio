import React, { useEffect, useRef } from 'react'
import { Box, Button, Chip, Container, Paper, Stack, Typography, useTheme } from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import TerminalIcon from '@mui/icons-material/Terminal'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/features/language-switch'
import { useColorMode } from '@/features/theme-switch'
import { localizedPath } from '@/shared/config'
import { usePageMeta } from '@/shared/lib'
import { PixelGoblin } from '@/widgets/pixel-goblin'
import { MAX_COMMAND_LENGTH, TERMINAL_QUICK_COMMANDS } from '../model/terminalCommands'
import { useTerminalSession, type TerminalHistoryEntry } from '../model/useTerminalSession'

const TERMINAL_DOT_COLORS = ['#ff5f56', '#ffbd2e', '#27c93f'] as const
const PROMPT_PREFIX = 'gonzalo@portfolio:~$'
const COMPACT_PROMPT_PREFIX = 'gonzalo:~$'

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { mode } = useColorMode()
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const consoleRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const { commandInput, history, initialBannerCleared, setCommandInput, executeCommand, handleInputKeyDown } =
    useTerminalSession((routePath) => {
      navigate(localizedPath(routePath, language))
    })

  usePageMeta({
    title: t('seo.notFound.title'),
    description: t('seo.notFound.description'),
    robots: 'noindex',
  })

  useEffect(() => {
    const el = consoleRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [history.length, initialBannerCleared])

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    executeCommand(commandInput)
  }

  const renderEntryOutput = (entry: TerminalHistoryEntry): { readonly text: string; readonly isError: boolean } => {
    switch (entry.outputType) {
      case 'help':
        return { text: t('notFound.terminalHelp'), isError: false }
      case 'ls':
        return { text: t('notFound.terminalLs'), isError: false }
      case 'pwd':
        return { text: `/home/gonzalo/portfolio${location.pathname}`, isError: false }
      case 'whoami':
        return { text: t('notFound.terminalWhoami'), isError: false }
      case 'cdNotFound':
        return {
          text: `bash: cd: ${entry.detail ?? ''}: ${t('notFound.terminalOutput')}`,
          isError: true,
        }
      case 'unknown':
        return {
          text: t('notFound.terminalUnknown', { cmd: entry.detail ?? entry.command }),
          isError: true,
        }
    }
  }

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Chip
            icon={<TerminalIcon aria-hidden="true" />}
            label={t('notFound.badge')}
            color="primary"
            variant="outlined"
            sx={{
              mb: 2,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontWeight: 700,
              letterSpacing: 0.8,
            }}
          />

          <Typography
            variant="h1"
            component="p"
            aria-hidden="true"
            sx={{
              fontSize: { xs: '4.5rem', sm: '6.5rem', md: '7.5rem' },
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              mb: 1,
              background:
                theme.palette.mode === 'dark'
                  ? `linear-gradient(135deg, #ffffff 20%, ${theme.palette.primary.main} 60%, ${theme.palette.secondary.main} 100%)`
                  : `linear-gradient(135deg, ${theme.palette.text.primary} 20%, ${theme.palette.primary.main} 70%, ${theme.palette.secondary.main} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              userSelect: 'none',
            }}
          >
            404
          </Typography>

          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.85rem', sm: '2.5rem' },
              mb: 1.5,
            }}
          >
            {t('notFound.heading')}
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              maxWidth: 560,
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.125rem' },
            }}
          >
            {t('notFound.description')}
          </Typography>
        </Box>

        <Box sx={{ position: 'relative', mt: 6, maxWidth: 640, mx: 'auto' }}>
          <PixelGoblin variant="lost" />
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 4 },
              borderRadius: 4,
              bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50',
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[8],
              overflow: 'hidden',
            }}
          >
            {/* Terminal window bar */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: 2,
                mb: 2.5,
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack direction="row" spacing={1} aria-hidden="true">
                {TERMINAL_DOT_COLORS.map((dotColor) => (
                  <Box
                    key={dotColor}
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: dotColor,
                    }}
                  />
                ))}
              </Stack>
              <Typography
                variant="caption"
                component="p"
                color="text.secondary"
                sx={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontWeight: 600,
                }}
              >
                {t('notFound.terminalTitle')}
              </Typography>
              <Box sx={{ width: 42 }} aria-hidden="true" />
            </Box>

            {/* Bounded interactive Linux terminal console with internal scroll */}
            <Box
              ref={consoleRef}
              data-testid="terminal-scroll-area"
              onClick={() => {
                const selection = window.getSelection()
                if (!selection || selection.toString().length === 0) {
                  inputRef.current?.focus()
                }
              }}
              sx={{
                p: { xs: 2, sm: 2.5 },
                mb: 2,
                maxHeight: { xs: 210, sm: 250 },
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                borderRadius: 2.5,
                bgcolor:
                  mode === 'glass'
                    ? 'rgba(10, 14, 26, 0.65)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(0, 0, 0, 0.35)'
                      : 'rgba(15, 23, 42, 0.05)',
                border: `1px solid ${theme.palette.divider}`,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                lineHeight: 1.7,
                overflowWrap: 'anywhere',
                cursor: 'text',
              }}
            >
              {!initialBannerCleared ? (
                <Box sx={{ mb: 1.5 }}>
                  <Typography
                    component="p"
                    sx={{
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      color: 'primary.main',
                      fontWeight: 700,
                      mb: 0.25,
                    }}
                  >
                    {PROMPT_PREFIX} cd {location.pathname}
                  </Typography>
                  <Typography
                    component="p"
                    sx={{
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      color: theme.palette.mode === 'light' ? 'error.dark' : 'error.light',
                      fontWeight: 600,
                      mb: 0.5,
                    }}
                  >
                    bash: cd: {location.pathname}: {t('notFound.terminalOutput')}
                  </Typography>
                  <Typography
                    component="p"
                    color="text.secondary"
                    sx={{
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                    }}
                  >
                    # {t('notFound.terminalHint')}
                  </Typography>
                </Box>
              ) : null}

              {history.map((entry) => {
                const output = renderEntryOutput(entry)
                return (
                  <Box key={entry.id} sx={{ mb: 1.25 }}>
                    <Typography
                      component="p"
                      sx={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        color: 'primary.main',
                        fontWeight: 700,
                        mb: 0.25,
                      }}
                    >
                      {PROMPT_PREFIX} {entry.command}
                    </Typography>
                    <Typography
                      component="p"
                      sx={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        color: output.isError
                          ? theme.palette.mode === 'light'
                            ? 'error.dark'
                            : 'error.light'
                          : 'text.primary',
                        fontWeight: output.isError ? 600 : 500,
                      }}
                    >
                      {output.text}
                    </Typography>
                  </Box>
                )
              })}

              <Box
                component="form"
                onSubmit={handleFormSubmit}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mt: 0.5,
                }}
              >
                <Typography
                  component="span"
                  aria-hidden="true"
                  sx={{
                    display: { xs: 'inline', sm: 'none' },
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    color: 'primary.main',
                    fontWeight: 700,
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  {COMPACT_PROMPT_PREFIX}
                </Typography>
                <Typography
                  component="span"
                  aria-hidden="true"
                  sx={{
                    display: { xs: 'none', sm: 'inline' },
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    color: 'primary.main',
                    fontWeight: 700,
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  {PROMPT_PREFIX}
                </Typography>
                <Box
                  ref={inputRef}
                  component="input"
                  type="text"
                  value={commandInput}
                  maxLength={MAX_COMMAND_LENGTH}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCommandInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  aria-label={t('notFound.terminalInputLabel')}
                  placeholder={t('notFound.terminalPlaceholder')}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: 'text.primary',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    p: 0,
                    caretColor: theme.palette.primary.main,
                    '&::placeholder': {
                      color: theme.palette.text.secondary,
                      opacity: 0.65,
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Quick terminal commands */}
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: 'wrap',
                justifyContent: 'center',
                mb: 3,
              }}
            >
              {TERMINAL_QUICK_COMMANDS.map((cmd) => (
                <Chip
                  key={cmd}
                  label={`$ ${cmd}`}
                  size="small"
                  variant="outlined"
                  onClick={() => executeCommand(cmd)}
                  sx={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}
                />
              ))}
            </Stack>

            {/* Navigation actions */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<HomeIcon aria-hidden="true" />}
                component={RouterLink}
                nativeButton={false}
                to={localizedPath('/', language)}
              >
                {t('notFound.backHome')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                endIcon={<ArrowForwardIcon aria-hidden="true" />}
                component={RouterLink}
                nativeButton={false}
                to={localizedPath('/projects', language)}
              >
                {t('notFound.viewProjects')}
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}

export default NotFoundPage
