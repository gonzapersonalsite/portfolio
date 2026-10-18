import type { ContactMessage } from './types'

export type ContactField = keyof ContactMessage

export type ContactFieldError = { kind: 'required' } | { kind: 'invalidEmail' } | { kind: 'tooLong'; max: number }

export type ContactErrors = Partial<Record<ContactField, ContactFieldError>>

// Form order, used to focus the first invalid field.
export const CONTACT_FIELDS: readonly ContactField[] = ['name', 'email', 'message']

type Rule = (value: string) => ContactFieldError | null

// A shape check only (text@domain.tld, no spaces); the mail server is the real judge.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const required: Rule = (value) => (value === '' ? { kind: 'required' } : null)
const maxLength =
  (max: number): Rule =>
  (value) =>
    value.length > max ? { kind: 'tooLong', max } : null
const emailShape: Rule = (value) => (EMAIL_SHAPE.test(value) ? null : { kind: 'invalidEmail' })

// 254 is the longest valid email address; the other limits keep the message within what the
// EmailJS template comfortably takes.
const FIELD_RULES: Record<ContactField, readonly Rule[]> = {
  name: [required, maxLength(100)],
  email: [required, maxLength(254), emailShape],
  message: [required, maxLength(5000)],
}

export function trimContactMessage(message: ContactMessage): ContactMessage {
  return { name: message.name.trim(), email: message.email.trim(), message: message.message.trim() }
}

// Expects trimmed text: whitespace alone counts as empty.
export function validateField(field: ContactField, value: string): ContactFieldError | null {
  for (const rule of FIELD_RULES[field]) {
    const error = rule(value)
    if (error !== null) return error
  }
  return null
}

export function validateContactMessage(message: ContactMessage): ContactErrors {
  const errors: ContactErrors = {}
  for (const field of CONTACT_FIELDS) {
    const error = validateField(field, message[field])
    if (error !== null) errors[field] = error
  }
  return errors
}
