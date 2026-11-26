import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/features/language-switch'
import { localizedPath } from '@/shared/config'
import { usePageMeta } from '@/shared/lib'
import { ArrowForwardIcon, HomeIcon, TerminalIcon } from '@/shared/ui'
import { PixelGoblin } from '@/widgets/pixel-goblin'
import { MAX_COMMAND_LENGTH, TERMINAL_QUICK_COMMANDS } from '../model/terminalCommands'
import { useTerminalSession, type TerminalHistoryEntry } from '../model/useTerminalSession'
import './NotFoundPage.css'

const PROMPT_PREFIX = 'gonzalo@portfolio:~$'
const COMPACT_PROMPT_PREFIX = 'gonzalo:~$'

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
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
    <div className="wb-container not-found">
      <div className="not-found__hero">
        <span className="wb-chip not-found__badge">
          <TerminalIcon />
          <span>{t('notFound.badge')}</span>
        </span>

        <p aria-hidden="true" className="not-found__code">
          404
        </p>

        <h1 className="not-found__title">{t('notFound.heading')}</h1>
        <p className="not-found__desc">{t('notFound.description')}</p>
      </div>

      <div className="wb-panel terminal-card">
        <PixelGoblin variant="lost" />

        <div className="terminal-card__body">
          <div className="terminal-chrome">
            <div className="terminal-dots" aria-hidden="true">
              <span className="terminal-dot" />
              <span className="terminal-dot" />
              <span className="terminal-dot" />
            </div>
            <p className="terminal-chrome__title">{t('notFound.terminalTitle')}</p>
            <div className="terminal-chrome__spacer" aria-hidden="true" />
          </div>

          <div
            ref={consoleRef}
            data-testid="terminal-scroll-area"
            className="terminal-scroll"
            onClick={() => {
              const selection = window.getSelection()
              if (!selection || selection.toString().length === 0) {
                inputRef.current?.focus()
              }
            }}
          >
            {!initialBannerCleared ? (
              <div className="terminal-block">
                <p className="terminal-line terminal-line--prompt">
                  {PROMPT_PREFIX} cd {location.pathname}
                </p>
                <p className="terminal-line terminal-line--error">
                  bash: cd: {location.pathname}: {t('notFound.terminalOutput')}
                </p>
                <p className="terminal-line terminal-line--hint"># {t('notFound.terminalHint')}</p>
              </div>
            ) : null}

            {history.map((entry) => {
              const output = renderEntryOutput(entry)
              return (
                <div key={entry.id} className="terminal-block">
                  <p className="terminal-line terminal-line--prompt">
                    {PROMPT_PREFIX} {entry.command}
                  </p>
                  <p className={output.isError ? 'terminal-line terminal-line--error' : 'terminal-line'}>
                    {output.text}
                  </p>
                </div>
              )
            })}

            <form className="terminal-form" onSubmit={handleFormSubmit}>
              <span aria-hidden="true" className="terminal-prompt terminal-prompt--compact">
                {COMPACT_PROMPT_PREFIX}
              </span>
              <span aria-hidden="true" className="terminal-prompt terminal-prompt--full">
                {PROMPT_PREFIX}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={commandInput}
                maxLength={MAX_COMMAND_LENGTH}
                onChange={(event) => setCommandInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                aria-label={t('notFound.terminalInputLabel')}
                placeholder={t('notFound.terminalPlaceholder')}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="terminal-input"
              />
            </form>
          </div>

          <div className="terminal-quick">
            {TERMINAL_QUICK_COMMANDS.map((cmd) => (
              <button key={cmd} type="button" className="terminal-quick-btn" onClick={() => executeCommand(cmd)}>
                $ {cmd}
              </button>
            ))}
          </div>

          <div className="terminal-nav-actions">
            <RouterLink to={localizedPath('/', language)} className="wb-btn-primary">
              <HomeIcon />
              <span>{t('notFound.backHome')}</span>
            </RouterLink>
            <RouterLink to={localizedPath('/projects', language)} className="wb-btn-secondary">
              <span>{t('notFound.viewProjects')}</span>
              <ArrowForwardIcon />
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
