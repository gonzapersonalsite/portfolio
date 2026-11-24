import { createTheme, type ThemeOptions } from '@mui/material/styles'
import { glassColors, glassEffects } from './glassStyles'

export const COLOR_MODES = ['light', 'dark', 'glass'] as const

export type ColorMode = (typeof COLOR_MODES)[number]

// Sizes are written in the pixels they measure at the browser's default text size and follow
// the size the reader chose: MUI gives these in px, which would stay fixed beside text that grows.
const rem = (px: number) => `${px / 16}rem`

// The narrowest page the layout is made for is 320 px at the default text size: 20 times that
// size. A window narrower than that counted in the reader's own size (320 px with text at
// 150 %) gets the compact rules, which let every text wrap. No window at the default size is.
export const NARROW_FOR_ITS_TEXT = '@media (max-width: 19.99em)'

// The glass look for filled and outlined buttons. Text buttons (nav links, card links) stay
// transparent so the three variants keep their hierarchy.
const glassButtonVariant = (background: string, hoverBackground: string, border: string) => ({
  background,
  border,
  boxShadow: glassEffects.innerBoxShadow,
  color: glassColors.text.primary,
  transition: 'transform 0.2s ease',
  '&:hover': {
    background: hoverBackground,
    boxShadow: `0 0 20px ${glassColors.neon.turquoise}`,
    transform: 'translateY(-2px)',
  },
})

// The icon beside the label of a button, in the sizes MUI gives it.
const BUTTON_ICON_SIZES = (
  [
    ['small', 18],
    ['medium', 20],
    ['large', 22],
  ] as const
).map(([size, px]) => ({ props: { size }, style: { '& > *:nth-of-type(1)': { fontSize: rem(px) } } }))

const getThemeOptions = (mode: ColorMode): ThemeOptions => {
  const isGlass = mode === 'glass'
  const muiMode = isGlass ? 'dark' : mode === 'light' ? 'light' : 'dark'
  const inputBorderColor = muiMode === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.45)'

  return {
    // MUI's own breakpoints, counted in the reader's text size instead of px: larger text gets the
    // narrower layout, as zoom does. step keeps the 0.05 px MUI leaves between two of them.
    breakpoints: {
      unit: 'rem',
      step: 5 / 16,
      values: { xs: 0, sm: 600 / 16, md: 900 / 16, lg: 1200 / 16, xl: 1536 / 16 },
    },
    palette: {
      mode: muiMode,
      primary: {
        main: isGlass ? glassColors.neon.turquoise : muiMode === 'light' ? '#1565c0' : '#90caf9',
        light: isGlass ? glassColors.neon.turquoise : muiMode === 'light' ? '#42a5f5' : '#e3f2fd',
        dark: isGlass ? glassColors.neon.violet : muiMode === 'light' ? '#0d47a1' : '#42a5f5',
      },
      secondary: {
        main: isGlass ? glassColors.neon.pink : muiMode === 'light' ? '#dc004e' : '#f48fb1',
      },
      error: {
        main: muiMode === 'light' ? '#c62828' : '#f44336',
        light: '#ef5350',
        dark: '#b71c1c',
      },
      background: {
        default: isGlass ? glassColors.background.deep : muiMode === 'light' ? '#f5f5f5' : '#121212',
        paper: isGlass ? glassColors.background.glassStart : muiMode === 'light' ? '#ffffff' : '#1e1e1e',
      },
      ...(isGlass
        ? {
            text: {
              primary: glassColors.text.primary,
              secondary: glassColors.text.secondary,
              disabled: glassColors.text.disabled,
            },
          }
        : {}),
    },
    typography: {
      fontFamily: '"Inter Variable", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '3.5rem',
        lineHeight: 1.2,
        ...(isGlass && {
          color: glassColors.text.primary,
          textShadow: glassEffects.textShadow(glassColors.neon.turquoise),
        }),
      },
      h2: {
        fontWeight: 600,
        fontSize: '2.5rem',
        lineHeight: 1.3,
        ...(isGlass && {
          color: glassColors.text.primary,
          textShadow: glassEffects.textShadow(glassColors.neon.violet),
        }),
      },
      h3: {
        fontWeight: 600,
        fontSize: '2rem',
        lineHeight: 1.4,
        ...(isGlass && {
          color: glassColors.text.primary,
          textShadow: glassEffects.textShadow(glassColors.neon.pink),
        }),
      },
      h4: {
        fontWeight: 500,
        fontSize: '1.5rem',
        lineHeight: 1.4,
        ...(isGlass && {
          color: glassColors.text.secondary,
        }),
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
        ...(isGlass && {
          color: glassColors.text.muted,
        }),
      },
      body2: {
        ...(isGlass && {
          color: glassColors.text.caption,
        }),
      },
      caption: {
        ...(isGlass && {
          color: glassColors.text.disabled,
        }),
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          [NARROW_FOR_ITS_TEXT]: {
            // A word wider than the page breaks instead of making the page scroll sideways.
            body: { overflowWrap: 'anywhere' },
            'h1, h2, h3, h4, h5, h6': { hyphens: 'auto' },
          },
        },
      },
      // MUI removes the outline of everything built on ButtonBase and marks the keyboard focus
      // with a translucent ripple alone, below 3:1. The browser's own ring comes back.
      MuiButtonBase: {
        styleOverrides: {
          root: { '&:focus-visible': { outline: 'revert', outlineOffset: 2 } },
        },
      },
      // Inside a list that clips what it holds, the ring is drawn within the item.
      MuiMenuItem: {
        styleOverrides: {
          root: { '&:focus-visible': { outlineOffset: -2 } },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { '&:focus-visible': { outlineOffset: -2 } },
        },
      },
      // The bar and the space kept under it grow with the text they hold.
      MuiToolbar: {
        styleOverrides: {
          regular: ({ theme }) => ({
            minHeight: rem(56),
            [theme.breakpoints.up('xs')]: { '@media (orientation: landscape)': { minHeight: rem(48) } },
            [theme.breakpoints.up('sm')]: { minHeight: rem(64) },
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            ...(isGlass && {
              // The primary action gets a neon tint so it stands out from the outlined one.
              '&.MuiButton-contained': glassButtonVariant(
                `linear-gradient(135deg, ${glassColors.neon.turquoise}33, ${glassColors.neon.violet}33)`,
                `linear-gradient(135deg, ${glassColors.neon.turquoise}4D, ${glassColors.neon.violet}4D)`,
                `1px solid ${glassColors.neon.turquoise}80`,
              ),
              '&.MuiButton-outlined': glassButtonVariant(
                `linear-gradient(135deg, ${glassColors.background.glassStart}, ${glassColors.background.glassEnd})`,
                `linear-gradient(135deg, ${glassColors.background.glassEnd}, ${glassColors.background.glassStart})`,
                glassEffects.border,
              ),
            }),
          },
          startIcon: { variants: BUTTON_ICON_SIZES },
          endIcon: { variants: BUTTON_ICON_SIZES },
        },
      },
      // MUI's default outline (23% opacity) is below the 3:1 non-text contrast minimum.
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            // MUI resets the hover colour on touch screens (a tap leaves :hover on); keep the
            // stronger border there too, without touching the focused, error and disabled colours.
            '@media (hover: none)': {
              '&:hover:not(.Mui-focused):not(.Mui-error):not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
                borderColor: inputBorderColor,
              },
            },
          },
          notchedOutline: {
            borderColor: inputBorderColor,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isGlass
              ? glassEffects.outerBoxShadow
              : muiMode === 'light'
                ? '0 2px 8px rgba(0,0,0,0.1)'
                : '0 2px 8px rgba(0,0,0,0.3)',
            ...(isGlass && {
              backdropFilter: glassEffects.blur,
              background: `linear-gradient(135deg, ${glassColors.background.glassStart}, ${glassColors.background.glassEnd})`,
              border: glassEffects.border,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: `0 20px 40px rgba(0,0,0,0.8), 0 0 20px ${glassColors.neon.violet}40`,
                '&::after': {
                  opacity: 1,
                },
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                boxShadow: glassEffects.innerBoxShadow,
                pointerEvents: 'none',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `radial-gradient(circle at 50% 0%, ${glassColors.neon.violet}15, transparent 70%)`,
                opacity: 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: 'none',
              },
            }),
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            ...(isGlass && {
              backdropFilter: glassEffects.blur,
              background: `linear-gradient(135deg, ${glassColors.background.glassStart}, ${glassColors.background.glassEnd})`,
              border: glassEffects.border,
              boxShadow: glassEffects.outerBoxShadow,
            }),
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            ...(isGlass && {
              backdropFilter: glassEffects.blur,
              background: 'rgba(3, 3, 20, 0.5)',
              borderBottom: glassEffects.border,
              boxShadow: 'none',
            }),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            height: rem(32),
            borderRadius: rem(16),
            [NARROW_FOR_ITS_TEXT]: { height: 'auto', minHeight: rem(32) },
            variants: [
              {
                props: { size: 'small' },
                style: {
                  height: rem(24),
                  [NARROW_FOR_ITS_TEXT]: { minHeight: rem(24) },
                  '& .MuiChip-icon': { fontSize: rem(18) },
                },
              },
              // Decorative labels use glass; semantic colours (success, error, etc.)
              // keep MUI's palette. Informational chips do not advertise a hover action.
              ...(isGlass
                ? [
                    {
                      props: { color: 'default' as const },
                      style: {
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: glassEffects.border,
                        color: glassColors.text.primary,
                      },
                    },
                  ]
                : []),
            ],
          },
          // A label too long for its line wraps instead of ending in an ellipsis.
          label: { [NARROW_FOR_ITS_TEXT]: { whiteSpace: 'normal', paddingBlock: '0.25em' } },
        },
      },
    },
    shape: {
      borderRadius: 8,
    },
  }
}

export const createAppTheme = (mode: ColorMode) => {
  return createTheme(getThemeOptions(mode))
}
