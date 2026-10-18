import { createContext, useContext } from 'react'
import type { ShowNotification } from '@/shared/lib'

export interface NotificationContextType {
  showNotification: ShowNotification
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
