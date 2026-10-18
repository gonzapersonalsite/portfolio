import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { getProfile } from '@/entities/profile'
import type { ShowNotification } from '@/shared/lib'
import { ContactNotConfiguredError, ContactTimeoutError, sendContactMessage } from '../api/contactApi'
import type { ContactMessage } from './types'
import {
  CONTACT_FIELDS,
  trimContactMessage,
  validateContactMessage,
  validateField,
  type ContactErrors,
  type ContactField,
  type ContactFieldError,
} from './validation'

const emptyForm: ContactMessage = { name: '', email: '', message: '' }

const isContactField = (name: string): name is ContactField => (CONTACT_FIELDS as readonly string[]).includes(name)

export function useContactForm(showNotification: ShowNotification) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ContactMessage>(emptyForm)
  const [errors, setErrors] = useState<ContactErrors>({})
  // State updates land after the render, so two quick submits would both read loading=false.
  const sendingRef = useRef(false)

  const errorText = (error: ContactFieldError): string => {
    switch (error.kind) {
      case 'required':
        return t('contact.form.required')
      case 'invalidEmail':
        return t('contact.form.invalidEmail')
      case 'tooLong':
        return t('contact.form.tooLong', { max: error.max })
    }
  }

  // Messages are derived on render, so they follow a language switch.
  const fieldErrors: Partial<Record<ContactField, string>> = Object.fromEntries(
    CONTACT_FIELDS.flatMap((field) => {
      const error = errors[field]
      return error === undefined ? [] : [[field, errorText(error)]]
    }),
  )

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    if (!isContactField(name)) return

    setFormData((previous) => ({ ...previous, [name]: value }))
    // A field that was flagged is checked again as it is corrected; untouched fields stay quiet.
    setErrors((previous) => {
      if (previous[name] === undefined) return previous
      const error = validateField(name, value.trim())
      const next = { ...previous }
      if (error === null) {
        delete next[name]
      } else {
        next[name] = error
      }
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sendingRef.current) return

    const message = trimContactMessage(formData)
    const nextErrors = validateContactMessage(message)
    setErrors(nextErrors)

    const firstInvalid = CONTACT_FIELDS.find((field) => nextErrors[field] !== undefined)
    if (firstInvalid !== undefined) {
      const form = event.currentTarget
      if (form instanceof HTMLFormElement) {
        ;(form.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus()
      }
      return
    }

    sendingRef.current = true
    setLoading(true)

    try {
      await sendContactMessage(message)
      showNotification(t('contact.form.success'), 'success', 6000)
      setFormData(emptyForm)
    } catch (error) {
      // Visitors cannot fix any of these causes, so every message points them to email instead.
      const { email } = getProfile()
      const text =
        error instanceof ContactNotConfiguredError
          ? t('contact.form.unavailable', { email })
          : error instanceof ContactTimeoutError
            ? t('contact.form.timeout', { email })
            : t('contact.form.sendFailed', { email })
      showNotification(text, 'error', 6000)
    } finally {
      sendingRef.current = false
      setLoading(false)
    }
  }

  return { formData, fieldErrors, loading, handleChange, handleSubmit }
}
