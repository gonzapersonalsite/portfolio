export const glassColors = {
  background: {
    deep: '#030314',
    glassStart: 'rgba(12, 20, 35, 0.25)',
    glassEnd: 'rgba(20, 25, 45, 0.25)',
  },
  neon: {
    turquoise: '#5DE0E6',
    violet: '#8A6EFF',
    pink: '#FF7B9C',
  },
  text: {
    primary: 'rgba(255, 255, 255, 0.98)',
    secondary: 'rgba(255, 255, 255, 0.92)',
    muted: 'rgba(255, 255, 255, 0.85)',
    caption: 'rgba(255, 255, 255, 0.75)',
    disabled: 'rgba(255, 255, 255, 0.60)',
  },
  border: 'rgba(255, 255, 255, 0.12)',
  innerShadow: 'rgba(255, 255, 255, 0.1)',
  outerShadow: 'rgba(0, 0, 0, 0.6)',
}

export const glassEffects = {
  // Reserve backdrop blur for surfaces that can overlap content, not each chip or button.
  blur: 'blur(16px) saturate(150%)',
  border: `0.5px solid ${glassColors.border}`,
  innerBoxShadow: `inset 0 0 0 0.5px ${glassColors.innerShadow}`,
  outerBoxShadow: `0 20px 40px ${glassColors.outerShadow}`,
  textShadow: (color: string) => `0 0 30px ${color}`,
}
