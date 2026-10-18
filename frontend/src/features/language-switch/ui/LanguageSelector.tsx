import React, { useId, useState } from 'react'
import { Button, Menu, MenuItem, Typography } from '@mui/material'
import TranslateIcon from '@mui/icons-material/Translate'
import { useTranslation } from 'react-i18next'
import type { Language } from '@/shared/config'
import { useLanguage } from '../model/LanguageContext'

// Each option is named in its own language, so visitors find theirs even when they cannot read
// the current one; `lang` lets screen readers pronounce it correctly.
const LANGUAGE_OPTIONS: ReadonlyArray<{ code: Language; name: string }> = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
]

const nameOf = (code: Language): string => LANGUAGE_OPTIONS.find((option) => option.code === code)?.name ?? code

const LanguageSelector: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { language, setLanguage } = useLanguage()
  const { t } = useTranslation()
  const buttonId = useId()
  const menuId = useId()
  const open = Boolean(anchorEl)
  const code = language.toUpperCase()

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLanguageChange = (selected: Language) => {
    setLanguage(selected)
    handleClose()
  }

  return (
    <>
      {/* Below sm only the icon is shown, so the aria-label is the name; it keeps the visible code. */}
      <Button
        id={buttonId}
        onClick={handleOpen}
        color="inherit"
        startIcon={<TranslateIcon fontSize="small" />}
        aria-label={t('common.languageButton', { name: nameOf(language), code })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        sx={{
          minWidth: 'auto',
          px: 1,
          // MUI's default icon margins (-4px / 8px) only make sense next to the text.
          '& .MuiButton-startIcon': { ml: { xs: 0, sm: -0.5 }, mr: { xs: 0, sm: 1 } },
        }}
      >
        <Typography
          component="span"
          variant="caption"
          sx={{ color: 'inherit', fontWeight: 'bold', display: { xs: 'none', sm: 'inline' } }}
        >
          {code}
        </Typography>
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{ list: { 'aria-labelledby': buttonId } }}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <MenuItem
            key={option.code}
            lang={option.code}
            role="menuitemradio"
            aria-checked={language === option.code}
            selected={language === option.code}
            onClick={() => handleLanguageChange(option.code)}
          >
            {option.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export default LanguageSelector
