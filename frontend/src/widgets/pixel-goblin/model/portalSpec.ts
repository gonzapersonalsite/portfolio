import {
  EASE_IN,
  EASE_IN_OUT,
  EASE_OUT,
  GOBLIN_LOOP_SECONDS,
  GOBLIN_PIXEL_UNIT,
  LINEAR,
  onTimeline,
  px,
  visibleWindow,
  type GoblinPalette,
  type PixelRect,
  type PortalBeckonSpec,
  type PortalParticleSpec,
  type PortalRippleSpec,
  type PortalSide,
  type PortalSpec,
  type TimelineSpec,
} from './goblinPrimitives'

const U = GOBLIN_PIXEL_UNIT

const makeParticle = (
  rect: PixelRect,
  dx1: number,
  dy1: number,
  dx2: number,
  dy2: number,
  openStart: number,
  closeEnd: number,
  phaseOffset: number,
  loopSeconds = GOBLIN_LOOP_SECONDS,
): PortalParticleSpec => {
  const span = closeEnd - openStart
  const t1 = Number((openStart + span * (0.18 + phaseOffset)).toFixed(4))
  const t2 = Number((openStart + span * (0.44 + phaseOffset)).toFixed(4))
  const t3 = Number((openStart + span * (0.7 + phaseOffset)).toFixed(4))
  const p1 = `${dx1 * U} ${dy1 * U}`
  const p2 = `${dx2 * U} ${dy2 * U}`
  return {
    rect,
    motion: onTimeline(
      ['0 0', '0 0', p1, p2, p1, '0 0', '0 0'],
      [0, openStart, t1, t2, t3, closeEnd, 1],
      [LINEAR, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, LINEAR],
      loopSeconds,
    ),
    opacity: onTimeline(
      ['0.72', '0.72', '1', '0.72', '1', '0.72', '0.72'],
      [0, openStart, t1, t2, t3, closeEnd, 1],
      [LINEAR, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, LINEAR],
      loopSeconds,
    ),
  }
}

const makeSurfaceRipple = (
  rect: PixelRect,
  colors: readonly [string, string, string],
  openStart: number,
  closeEnd: number,
  phaseOffset: number,
  loopSeconds = GOBLIN_LOOP_SECONDS,
): PortalRippleSpec => {
  const span = closeEnd - openStart
  const stops = [0.12, 0.28, 0.44, 0.6, 0.76, 0.9].map((ratio) =>
    Number(Math.min(closeEnd - 0.002, openStart + span * ((ratio + phaseOffset) % 0.92)).toFixed(4)),
  )
  const sortedStops = [...stops].sort((a, b) => a - b)
  const [c0, c1, c2] = colors
  return {
    rect,
    opacity: onTimeline(
      ['0.22', '0.22', '0.92', '0.35', '0.96', '0.3', '0.9', '0.38', '0.22', '0.22'],
      [0, openStart, ...sortedStops, closeEnd, 1],
      [LINEAR, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, LINEAR],
      loopSeconds,
    ),
    fill: onTimeline(
      [c0, c0, c1, c2, c0, c1, c2, c1, c0, c0],
      [0, openStart, ...sortedStops, closeEnd, 1],
      [LINEAR, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, LINEAR],
      loopSeconds,
    ),
  }
}

const buildRingScale = (
  openStart: number,
  openEnd: number,
  closeStart: number,
  closeEnd: number,
  loopSeconds = GOBLIN_LOOP_SECONDS,
): TimelineSpec =>
  onTimeline(
    ['0 0', '0 0', '1 1', '1 1', '0 0', '0 0'],
    [0, openStart, openEnd, closeStart, closeEnd, 1],
    [LINEAR, EASE_OUT, LINEAR, EASE_IN, LINEAR],
    loopSeconds,
  )

export const buildPortalSpec = (
  side: PortalSide,
  portalX: number,
  portalY: number,
  palette: GoblinPalette,
  openStart: number,
  openFull: number,
  closeStart: number,
  closeEnd: number,
  loopSeconds = GOBLIN_LOOP_SECONDS,
): PortalSpec => {
  const inward = side === 'entry' ? 1 : -1
  // 17-row tall 2D side-view vortex (rows -8..+8, y = 3..54), strictly bounded above the ground line.
  const rects: PixelRect[] = [
    px(0, -8, 1, 1, palette.portalGlow),
    px(-1, -7, 3, 1, palette.portalGlow),
    px(-2, -6, 5, 2, palette.portalGlow),
    px(-3, -4, 7, 9, palette.portalGlow),
    px(-2, 5, 5, 2, palette.portalGlow),
    px(-1, 7, 3, 1, palette.portalGlow),
    px(-2, 8, 5, 1, palette.portalGlow),
  ]

  // Swirling mid vortex rim with stepped profile, strictly inside outer glow.
  const rimRects: PixelRect[] = [
    px(0, -7, 1, 1, palette.portalRim),
    px(-1, -6, 3, 2, palette.portalRim),
    px(-2, -4, 5, 9, palette.portalRim),
    px(-1, 5, 3, 2, palette.portalRim),
    px(-1, 7, 3, 2, palette.portalRim),
  ]

  // Inner bright rift + static spiral vortex bands, strictly inside the rim; last rect sits at row +8 (y = 51..54).
  const coreRects: PixelRect[] = [
    px(0, -6, 1, 2, palette.portalCore),
    px(-1, -4, 3, 9, palette.portalCore),
    px(0, 5, 1, 3, palette.portalCore),
    px(-1, -3, 1, 2, palette.portalGlow),
    px(1, -1, 1, 2, palette.portalGlow),
    px(-1, 1, 1, 2, palette.portalGlow),
    px(1, 3, 1, 1, palette.portalGlow),
    px(0, 8, 1, 1, palette.portalCore),
  ]

  // Subtle lake-like surface ripples undulating across the fixed core pixel grid (zero translate transforms).
  const waveColors: readonly [string, string, string] = [palette.portalCore, palette.portalRim, palette.portalGlow]
  const ripples: PortalRippleSpec[] = [
    makeSurfaceRipple(px(0, -5, 1, 2, palette.portalRim), waveColors, openStart, closeEnd, 0.0, loopSeconds),
    makeSurfaceRipple(px(-1, -3, 2, 2, palette.portalGlow), waveColors, openStart, closeEnd, 0.12, loopSeconds),
    makeSurfaceRipple(px(0, -1, 2, 2, palette.portalRim), waveColors, openStart, closeEnd, 0.24, loopSeconds),
    makeSurfaceRipple(px(-1, 1, 2, 2, palette.portalGlow), waveColors, openStart, closeEnd, 0.36, loopSeconds),
    makeSurfaceRipple(px(0, 3, 2, 2, palette.portalRim), waveColors, openStart, closeEnd, 0.48, loopSeconds),
    makeSurfaceRipple(px(0, 5, 1, 2, palette.portalGlow), waveColors, openStart, closeEnd, 0.6, loopSeconds),
  ]

  const particles: PortalParticleSpec[] = [
    makeParticle(
      px(inward * 3, -6, 1, 1, palette.portalCore),
      inward * 1,
      -0.5,
      -inward * 0.5,
      0.5,
      openStart,
      closeEnd,
      0.0,
      loopSeconds,
    ),
    makeParticle(
      px(inward * 4, -3, 1, 2, palette.portalRim),
      inward * 1,
      0.5,
      -inward * 0.5,
      -0.5,
      openStart,
      closeEnd,
      0.03,
      loopSeconds,
    ),
    makeParticle(
      px(-inward * 3, -5, 1, 1, palette.portalCore),
      -inward * 0.5,
      -0.5,
      inward * 0.5,
      0.5,
      openStart,
      closeEnd,
      0.06,
      loopSeconds,
    ),
    makeParticle(
      px(inward * 4, 0, 2, 1, palette.portalCore),
      inward * 1,
      -0.5,
      -inward * 0.5,
      0.5,
      openStart,
      closeEnd,
      0.02,
      loopSeconds,
    ),
    makeParticle(
      px(inward * 3, 3, 1, 2, palette.portalRim),
      inward * 1,
      0.5,
      -inward * 0.5,
      -0.5,
      openStart,
      closeEnd,
      0.05,
      loopSeconds,
    ),
    makeParticle(
      px(-inward * 3, 3, 1, 1, palette.portalGlow),
      -inward * 0.5,
      0.5,
      inward * 0.5,
      -0.5,
      openStart,
      closeEnd,
      0.08,
      loopSeconds,
    ),
    makeParticle(
      px(inward * 4, 6, 1, 1, palette.portalCore),
      inward * 1,
      -0.5,
      -inward * 0.5,
      0.5,
      openStart,
      closeEnd,
      0.04,
      loopSeconds,
    ),
    makeParticle(
      px(inward * 1, -8, 1, 1, palette.portalCore),
      inward * 0.5,
      -0.5,
      -inward * 0.5,
      0.5,
      openStart,
      closeEnd,
      0.07,
      loopSeconds,
    ),
  ]

  const openSpan = openFull - openStart
  const closeSpan = closeEnd - closeStart

  // Radial progression from the epicenter (1.5, 1.5) using a single continuous spline per transition:
  // Opening (inside -> out): core bursts from epicenter first, then rim, then outer glow & particles.
  // Closing (outside -> in): outer glow & particles collapse inward first, then rim, then core into epicenter.
  const coreScale = buildRingScale(
    openStart,
    Number((openStart + openSpan * 0.64).toFixed(4)),
    Number((closeStart + closeSpan * 0.36).toFixed(4)),
    closeEnd,
    loopSeconds,
  )
  const rimScale = buildRingScale(
    Number((openStart + openSpan * 0.18).toFixed(4)),
    Number((openStart + openSpan * 0.82).toFixed(4)),
    Number((closeStart + closeSpan * 0.18).toFixed(4)),
    Number((closeEnd - closeSpan * 0.18).toFixed(4)),
    loopSeconds,
  )
  const scale = buildRingScale(
    Number((openStart + openSpan * 0.36).toFixed(4)),
    openFull,
    closeStart,
    Number((closeEnd - closeSpan * 0.36).toFixed(4)),
    loopSeconds,
  )

  const opacity = visibleWindow([[openStart, closeEnd]], loopSeconds)

  const pulseT1 = Number((openStart + (closeEnd - openStart) * 0.25).toFixed(4))
  const pulseT2 = Number((openStart + (closeEnd - openStart) * 0.5).toFixed(4))
  const pulseT3 = Number((openStart + (closeEnd - openStart) * 0.75).toFixed(4))
  const corePulse = onTimeline(
    ['1', '1', '0.86', '1', '0.86', '1', '1'],
    [0, openStart, pulseT1, pulseT2, pulseT3, closeEnd, 1],
    [LINEAR, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, LINEAR],
    loopSeconds,
  )

  return {
    side,
    x: portalX,
    y: portalY,
    pivotX: U / 2,
    pivotY: U / 2,
    rects,
    rimRects,
    coreRects,
    ripples,
    particles,
    scale,
    rimScale,
    coreScale,
    opacity,
    corePulse,
  }
}

// Builds the pixel-art goblin arm + beckoning hand reaching out of the exit portal.
// Once extended, the sleeve, forearm, palm, and thumb remain stationary; only the fingers curl to beckon.
export const buildExitBeckonSpec = (
  exitPortalX: number,
  portalCenterY: number,
  t: GoblinPalette,
  loopSeconds: number,
): PortalBeckonSpec => ({
  x: exitPortalX,
  y: portalCenterY,
  armRects: [
    // Dark sleeve cuff at the portal rift boundary
    px(-2, -1, 2, 1, t.lidDark),
    px(-2, 0, 2, 3, t.keys),
    px(-1, -1, 1, 4, t.ink),
    // Stationary horizontal forearm (3 rows: top highlight, mid body, bottom shade)
    px(-6, 0, 4, 1, t.highlight),
    px(-6, 1, 4, 1, t.body),
    px(-6, 2, 4, 1, t.shade),
    // Wrist crease, open palm base & upward goblin thumb
    px(-7, 0, 1, 2, t.shade),
    px(-9, -1, 2, 1, t.highlight),
    px(-9, 0, 3, 2, t.body),
    px(-9, 2, 3, 1, t.shade),
    px(-7, -2, 1, 1, t.highlight),
    px(-8, -3, 1, 2, t.ear),
  ],
  fingerRects: [
    // Profiled fingers & curled index tip that wave/curl inward toward the palm
    px(-11, -1, 2, 1, t.highlight),
    px(-11, 0, 2, 1, t.body),
    px(-11, 1, 2, 1, t.shade),
    px(-12, -1, 1, 2, t.highlight),
    px(-12, -2, 2, 1, t.ear),
  ],
  reach: onTimeline(
    [`${13 * U} 0`, `${13 * U} 0`, '0 0', '0 0', `${13 * U} 0`, `${13 * U} 0`],
    [0, 0.72, 0.748, 0.87, 0.905, 1],
    [LINEAR, EASE_OUT, LINEAR, EASE_IN, LINEAR],
    loopSeconds,
  ),
  fingerWave: onTimeline(
    [
      '0 0',
      '0 0',
      `${2 * U} ${-U}`,
      '0 0',
      `${2 * U} ${-U}`,
      '0 0',
      `${2 * U} ${-U}`,
      '0 0',
      `${2 * U} ${-U}`,
      '0 0',
      '0 0',
    ],
    [0, 0.748, 0.763, 0.778, 0.793, 0.808, 0.823, 0.838, 0.853, 0.868, 1],
    [
      LINEAR,
      EASE_IN_OUT,
      EASE_IN_OUT,
      EASE_IN_OUT,
      EASE_IN_OUT,
      EASE_IN_OUT,
      EASE_IN_OUT,
      EASE_IN_OUT,
      EASE_IN_OUT,
      LINEAR,
    ],
    loopSeconds,
  ),
  visible: visibleWindow([[0.72, 0.908]], loopSeconds),
})
