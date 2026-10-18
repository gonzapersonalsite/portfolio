import React from 'react'
import { Box, TextField, Button, CircularProgress } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { useTranslation } from 'react-i18next'
import type { ShowNotification } from '@/shared/lib'
import { useContactForm } from '../model/useContactForm'

interface ContactFormProps {
  onShowNotification: ShowNotification
}

// noValidate: the browser would word its own error bubbles in the browser's language, not the
// site's, so the hook validates and the fields show translated messages. `required` stays for
// the asterisk and aria-required. While sending, readOnly preserves focus and prevents a new
// draft from being erased when the submitted message succeeds.
const ContactForm: React.FC<ContactFormProps> = ({ onShowNotification }) => {
  const { t } = useTranslation()
  const { formData, fieldErrors, loading, handleChange, handleSubmit } = useContactForm(onShowNotification)

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit}
      aria-busy={loading}
      sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
    >
      <TextField
        label={t('contact.form.name')}
        name="name"
        autoComplete="name"
        slotProps={{ input: { readOnly: loading } }}
        value={formData.name}
        onChange={handleChange}
        error={fieldErrors.name !== undefined}
        helperText={fieldErrors.name}
        required
        fullWidth
        variant="outlined"
      />
      <TextField
        label={t('contact.form.email')}
        name="email"
        type="email"
        autoComplete="email"
        slotProps={{ input: { readOnly: loading } }}
        value={formData.email}
        onChange={handleChange}
        error={fieldErrors.email !== undefined}
        helperText={fieldErrors.email}
        required
        fullWidth
        variant="outlined"
      />
      <TextField
        label={t('contact.form.message')}
        name="message"
        slotProps={{ input: { readOnly: loading } }}
        value={formData.message}
        onChange={handleChange}
        error={fieldErrors.message !== undefined}
        helperText={fieldErrors.message}
        required
        fullWidth
        multiline
        rows={4}
        variant="outlined"
      />

      {/* aria-disabled instead of disabled: a disabled button drops the keyboard focus. */}
      <Button
        type="submit"
        variant="contained"
        size="large"
        endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        aria-disabled={loading}
        sx={{
          mt: 2,
          py: 1.5,
          fontWeight: 'bold',
          borderRadius: 2,
        }}
      >
        {loading ? t('common.sending') : t('contact.form.submit')}
      </Button>
    </Box>
  )
}

export default ContactForm
