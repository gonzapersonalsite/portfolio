import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from '@/features/language-switch'
import { ThemeProvider } from '@/features/theme-switch'
import { NotificationProvider } from '@/features/notifications'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
