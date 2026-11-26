import { Component, type ErrorInfo, type ReactNode } from 'react'
import { i18n, localizedPath, pathnameLanguage, toSupportedLanguage } from '@/shared/config'
import { AlertCircleIcon } from './Icons'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      const language = pathnameLanguage(window.location.pathname) ?? toSupportedLanguage(i18n.language) ?? 'es'
      const homeHref = localizedPath('/', language)

      return (
        <main className="error-boundary wb-container">
          <div className="wb-panel error-boundary__card">
            <AlertCircleIcon className="error-boundary__icon" />
            <h1 className="error-boundary__title">{i18n.t('common.errorBoundaryTitle')}</h1>
            <p className="error-boundary__desc">{i18n.t('common.errorBoundaryDescription')}</p>
            <div className="error-boundary__actions">
              <button type="button" className="wb-btn-primary" onClick={this.handleReload}>
                {i18n.t('common.errorBoundaryRefresh')}
              </button>
              <a className="wb-btn-secondary" href={homeHref}>
                {i18n.t('common.errorBoundaryHome')}
              </a>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
