import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { NotificationSeverity } from '@/shared/lib'
import { CloseIcon } from '@/shared/ui'
import { NotificationContext } from '../model/NotificationContext'
import './NotificationProvider.css'

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<NotificationSeverity>('info')
  const [duration, setDuration] = useState(6000)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const showNotification = useCallback(
    (msg: string, sev: NotificationSeverity = 'info', autoHideDuration = 6000) => {
      clearTimer()
      setMessage(msg)
      setSeverity(sev)
      setDuration(autoHideDuration)
      setOpen(true)
    },
    [clearTimer],
  )

  useEffect(() => {
    if (!open || duration <= 0) return
    timerRef.current = window.setTimeout(() => {
      setOpen(false)
      timerRef.current = null
    }, duration)
    return clearTimer
  }, [open, duration, message, severity, clearTimer])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {open ? (
        <div className="notification-region">
          <div className={`notification-alert notification-alert--${severity}`} role="alert">
            <span>{message}</span>
            <button
              type="button"
              className="notification-alert__close"
              aria-label={t('common.close')}
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      ) : null}
    </NotificationContext.Provider>
  )
}
