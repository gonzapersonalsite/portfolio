// The kinds of feedback the site gives the visitor; features/notifications renders each one.
export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error'

// How any slice reports feedback to the visitor; features/notifications provides the implementation.
export type ShowNotification = (message: string, severity?: NotificationSeverity, duration?: number) => void
