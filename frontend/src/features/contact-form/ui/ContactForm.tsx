import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShowNotification } from '@/shared/lib'
import { SendIcon } from '@/shared/ui'
import { useContactForm } from '../model/useContactForm'
import './ContactForm.css'

interface ContactFormProps {
  onShowNotification: ShowNotification
}

const ContactForm: React.FC<ContactFormProps> = ({ onShowNotification }) => {
  const { t } = useTranslation()
  const { formData, fieldErrors, loading, handleChange, handleSubmit } = useContactForm(onShowNotification)
  const nameId = useId()
  const emailId = useId()
  const messageId = useId()
  const nameErrorId = useId()
  const emailErrorId = useId()
  const messageErrorId = useId()

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate aria-busy={loading}>
      <div className="contact-form__field">
        <label className="contact-form__label" htmlFor={nameId}>
          {t('contact.form.name')} *
        </label>
        <input
          id={nameId}
          type="text"
          name="name"
          autoComplete="name"
          required
          value={formData.name}
          readOnly={loading}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? nameErrorId : undefined}
          className="contact-form__input"
        />
        {fieldErrors.name ? (
          <p id={nameErrorId} className="contact-form__error">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="contact-form__field">
        <label className="contact-form__label" htmlFor={emailId}>
          {t('contact.form.email')} *
        </label>
        <input
          id={emailId}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={formData.email}
          readOnly={loading}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? emailErrorId : undefined}
          className="contact-form__input"
        />
        {fieldErrors.email ? (
          <p id={emailErrorId} className="contact-form__error">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="contact-form__field">
        <label className="contact-form__label" htmlFor={messageId}>
          {t('contact.form.message')} *
        </label>
        <textarea
          id={messageId}
          name="message"
          rows={5}
          required
          value={formData.message}
          readOnly={loading}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? messageErrorId : undefined}
          className="contact-form__textarea"
        />
        {fieldErrors.message ? (
          <p id={messageErrorId} className="contact-form__error">
            {fieldErrors.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className="wb-btn-primary contact-form__submit"
        aria-disabled={loading ? 'true' : undefined}
      >
        <SendIcon />
        <span>{loading ? t('common.sending') : t('contact.form.submit')}</span>
      </button>
    </form>
  )
}

export default ContactForm
