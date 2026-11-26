import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { type ColorMode } from '@/shared/config'
import { usePrefersReducedMotion } from '@/shared/lib'
import { MoonIcon, MotionPauseIcon, MotionPlayIcon, SunIcon } from '@/shared/ui'
import { useColorMode } from '../model/ThemeContext'
import './ThemeSelector.css'

type AnimationsControlState = 'running' | 'paused' | 'pausedBySystem'

const ThemeSelector: React.FC = () => {
  const { mode, setColorMode, animationsPaused, setAnimationsPaused } = useColorMode()
  const reducedMotion = usePrefersReducedMotion()
  const { t } = useTranslation()
  const reducedMotionReasonId = useId()

  const nextMode: ColorMode = mode === 'light' ? 'dark' : 'light'
  const currentLabel = mode === 'light' ? t('common.theme.light') : t('common.theme.dark')
  const nextLabel = nextMode === 'light' ? t('common.theme.light') : t('common.theme.dark')

  const animationsState: AnimationsControlState = reducedMotion
    ? 'pausedBySystem'
    : animationsPaused
      ? 'paused'
      : 'running'
  // The visible word is part of the accessible name in every state (WCAG 2.5.3, label in name).
  const animationsText: Record<AnimationsControlState, { label: string; visible: string }> = {
    running: { label: t('common.animations.pause'), visible: t('common.animations.pauseShort') },
    paused: { label: t('common.animations.resume'), visible: t('common.animations.resumeShort') },
    pausedBySystem: { label: t('common.animations.paused'), visible: t('common.animations.pausedShort') },
  }
  const animationsControl = animationsText[animationsState]

  return (
    <div className="theme-controls">
      <button
        type="button"
        className="theme-control-btn"
        onClick={() => setColorMode(nextMode)}
        aria-label={t('common.themeSwitchTo', { current: currentLabel, next: nextLabel })}
        title={t('common.themeSwitchTo', { current: currentLabel, next: nextLabel })}
      >
        {mode === 'light' ? (
          <SunIcon className="theme-control-btn__icon" />
        ) : (
          <MoonIcon className="theme-control-btn__icon" />
        )}
        <span className="theme-control-btn__label--desktop">{currentLabel}</span>
      </button>

      <button
        type="button"
        className="theme-control-btn"
        aria-label={animationsControl.label}
        aria-disabled={reducedMotion ? 'true' : undefined}
        aria-describedby={reducedMotion ? reducedMotionReasonId : undefined}
        title={
          reducedMotion
            ? `${animationsControl.label}: ${t('common.animations.reducedSystem')}`
            : animationsControl.label
        }
        onClick={() => {
          if (reducedMotion) return
          setAnimationsPaused(!animationsPaused)
        }}
      >
        {animationsState === 'running' ? (
          <MotionPauseIcon className="theme-control-btn__icon" />
        ) : (
          <MotionPlayIcon className="theme-control-btn__icon" />
        )}
        <span className="theme-control-btn__label--desktop">{animationsControl.visible}</span>
      </button>

      {reducedMotion ? (
        <span id={reducedMotionReasonId} className="sr-only">
          {t('common.animations.reducedSystem')}
        </span>
      ) : null}
    </div>
  )
}

export default ThemeSelector
