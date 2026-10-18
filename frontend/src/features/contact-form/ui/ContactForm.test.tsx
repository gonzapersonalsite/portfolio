import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ContactForm } from '@/features/contact-form'
import { i18n } from '@/shared/config'
import { sendContactMessage } from '../api/contactApi'

vi.mock('../api/contactApi', () => ({
  sendContactMessage: vi.fn(),
  ContactNotConfiguredError: class extends Error {},
  ContactTimeoutError: class extends Error {},
}))

const renderForm = () => render(<ContactForm onShowNotification={vi.fn()} />)

const formOf = (container: HTMLElement): HTMLFormElement => {
  const form = container.querySelector('form')
  if (form === null) throw new Error('form not rendered')
  return form
}

describe('ContactForm', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('es')
  })

  it('lets the browser autofill the visitor name and email', () => {
    renderForm()

    expect(screen.getByRole('textbox', { name: /Nombre/ }).getAttribute('autocomplete')).toBe('name')
    expect(screen.getByRole('textbox', { name: /Correo/ }).getAttribute('autocomplete')).toBe('email')
  })

  it('validates in the site language instead of the browser bubbles, and focuses the first problem', () => {
    const { container } = renderForm()
    const form = formOf(container)
    expect(form.noValidate).toBe(true)

    fireEvent.change(screen.getByRole('textbox', { name: /Correo/ }), { target: { value: 'nope' } })
    fireEvent.submit(form)

    const name = screen.getByRole('textbox', { name: /Nombre/ })
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getAllByText('Este campo es obligatorio.')).toHaveLength(2)
    expect(screen.getByText(/Introduce un correo electrónico válido/)).toBeTruthy()
    expect(document.activeElement).toBe(name)
    expect(sendContactMessage).not.toHaveBeenCalled()
  })

  it.each([
    { outcome: 'success', result: () => Promise.resolve() },
    { outcome: 'failure', result: () => Promise.reject(new Error('network unavailable')) },
  ])('keeps fields read-only and focusable until sending ends in $outcome', async ({ result }) => {
    let finish: () => void
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    }).then(result)
    vi.mocked(sendContactMessage).mockReturnValueOnce(pending)
    const { container } = renderForm()
    fireEvent.change(screen.getByRole('textbox', { name: /Nombre/ }), { target: { value: 'Ada' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Correo/ }), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Mensaje/ }), { target: { value: 'Hola' } })

    const message = screen.getByRole<HTMLTextAreaElement>('textbox', { name: /Mensaje/ })
    message.focus()
    fireEvent.submit(formOf(container))

    const button = await screen.findByRole('button', { name: /Enviando/ })
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(formOf(container).getAttribute('aria-busy')).toBe('true')
    const fields = screen.getAllByRole<HTMLInputElement | HTMLTextAreaElement>('textbox')
    expect(fields.every((field) => field.readOnly && !field.disabled)).toBe(true)
    expect(document.activeElement).toBe(message)

    await act(async () => {
      finish()
    })

    expect(fields.every((field) => !field.readOnly && !field.disabled)).toBe(true)
    expect(formOf(container).getAttribute('aria-busy')).toBe('false')
    expect(document.activeElement).toBe(message)
  })
})
