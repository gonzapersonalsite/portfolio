import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ChangeEvent, FormEvent } from 'react'
import { useContactForm } from './useContactForm'
import { getProfile } from '@/entities/profile'
import { ContactNotConfiguredError, ContactTimeoutError, sendContactMessage } from '../api/contactApi'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options === undefined ? key : `${key}|${Object.values(options).join('|')}`,
  }),
}))

vi.mock('../api/contactApi', () => {
  class ContactNotConfiguredError extends Error {}
  class ContactTimeoutError extends Error {
    constructor(timeoutMs: number) {
      super(`timed out after ${timeoutMs}ms`)
    }
  }
  return {
    sendContactMessage: vi.fn(),
    ContactNotConfiguredError,
    ContactTimeoutError,
  }
})

const showNotification = vi.fn()
const { email } = getProfile()
const mockedSendContactMessage = vi.mocked(sendContactMessage)
const submitEvent = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>

const change = (name: string, value: string) => ({ target: { name, value } }) as ChangeEvent<HTMLInputElement>

const renderFilledForm = () => {
  const hook = renderHook(() => useContactForm(showNotification))
  act(() => {
    hook.result.current.handleChange(change('name', '  Ada  '))
    hook.result.current.handleChange(change('email', 'ada@example.com'))
    hook.result.current.handleChange(change('message', 'Hello there'))
  })
  return hook
}

describe('useContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends the trimmed message and notifies success', async () => {
    mockedSendContactMessage.mockResolvedValueOnce(undefined)
    const { result } = renderFilledForm()

    await act(async () => {
      await result.current.handleSubmit(submitEvent)
    })

    expect(mockedSendContactMessage).toHaveBeenCalledWith({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hello there',
    })
    expect(showNotification).toHaveBeenCalledWith('contact.form.success', 'success', 6000)
    expect(result.current.formData).toEqual({ name: '', email: '', message: '' })
  })

  it('does not send blank or whitespace-only fields and explains each one', async () => {
    const { result } = renderHook(() => useContactForm(showNotification))
    act(() => result.current.handleChange(change('name', '   ')))

    await act(async () => {
      await result.current.handleSubmit(submitEvent)
    })

    expect(mockedSendContactMessage).not.toHaveBeenCalled()
    expect(result.current.fieldErrors).toEqual({
      name: 'contact.form.required',
      email: 'contact.form.required',
      message: 'contact.form.required',
    })
  })

  it('rejects a malformed email and an over-long name', async () => {
    const { result } = renderFilledForm()
    act(() => {
      result.current.handleChange(change('email', 'ada@example'))
      result.current.handleChange(change('name', 'x'.repeat(101)))
    })

    await act(async () => {
      await result.current.handleSubmit(submitEvent)
    })

    expect(mockedSendContactMessage).not.toHaveBeenCalled()
    expect(result.current.fieldErrors).toEqual({
      name: 'contact.form.tooLong|100',
      email: 'contact.form.invalidEmail',
    })
  })

  it('clears a field error as soon as the field is corrected', async () => {
    const { result } = renderFilledForm()
    act(() => result.current.handleChange(change('email', 'nope')))
    await act(async () => {
      await result.current.handleSubmit(submitEvent)
    })
    expect(result.current.fieldErrors.email).toBe('contact.form.invalidEmail')

    act(() => result.current.handleChange(change('email', 'ada@example.com')))

    expect(result.current.fieldErrors.email).toBeUndefined()
  })

  it('sends only once when submitted twice before the first send finishes', async () => {
    let finish: () => void = () => {}
    mockedSendContactMessage.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const { result } = renderFilledForm()

    await act(async () => {
      const first = result.current.handleSubmit(submitEvent)
      const second = result.current.handleSubmit(submitEvent)
      finish()
      await Promise.all([first, second])
    })

    expect(mockedSendContactMessage).toHaveBeenCalledTimes(1)
  })

  it('tells the visitor the form is unavailable and offers the email when EmailJS is not configured', async () => {
    mockedSendContactMessage.mockRejectedValueOnce(new ContactNotConfiguredError())
    const { result } = renderFilledForm()

    await act(async () => {
      await result.current.handleSubmit(submitEvent)
    })

    expect(showNotification).toHaveBeenCalledWith(`contact.form.unavailable|${email}`, 'error', 6000)
  })

  it('warns that a timed-out message may have been sent, instead of inviting a resend', async () => {
    mockedSendContactMessage.mockRejectedValueOnce(new ContactTimeoutError(15000))
    const { result } = renderFilledForm()

    await act(async () => {
      await result.current.handleSubmit(submitEvent)
    })

    expect(showNotification).toHaveBeenCalledWith(`contact.form.timeout|${email}`, 'error', 6000)
    expect(result.current.formData.message).toBe('Hello there')
  })

  it('asks the visitor to retry or use the email when sending fails', async () => {
    mockedSendContactMessage.mockRejectedValueOnce(new Error('network down'))
    const { result } = renderFilledForm()

    await act(async () => {
      await result.current.handleSubmit(submitEvent)
    })

    expect(showNotification).toHaveBeenCalledWith(`contact.form.sendFailed|${email}`, 'error', 6000)
  })
})
