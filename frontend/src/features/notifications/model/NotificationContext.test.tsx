import { describe, it, expect, vi } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import React from 'react'
import { useNotification, NotificationProvider } from '@/features/notifications'
import { i18n } from '@/shared/config'

const Trigger: React.FC<{ message: string }> = ({ message }) => {
  const { showNotification } = useNotification()
  return (
    <button type="button" onClick={() => showNotification(message, 'error', 5000)}>
      notify
    </button>
  )
}

describe('NotificationProvider', () => {
  it('announces the message as an alert with the requested severity', async () => {
    await i18n.changeLanguage('en')
    render(
      <NotificationProvider>
        <Trigger message="Could not send" />
      </NotificationProvider>,
    )

    act(() => screen.getByRole('button', { name: 'notify' }).click())

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Could not send')
    expect(alert.className).toContain('Error')
  })

  it('names the close button in the site language', async () => {
    await i18n.changeLanguage('es')
    render(
      <NotificationProvider>
        <Trigger message="No se pudo enviar" />
      </NotificationProvider>,
    )

    act(() => screen.getByRole('button', { name: 'notify' }).click())

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy()
  })

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useNotification())).toThrow(
      'useNotification must be used within a NotificationProvider',
    )
    spy.mockRestore()
  })
})
