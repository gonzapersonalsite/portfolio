import type { ColorMode } from '@/shared/config'

export const GOBLIN_PIXEL_UNIT = 3
export const GOBLIN_LOOP_SECONDS = 16
export const GOBLIN_STAGE_WIDTH = 384
export const GOBLIN_TOP_MARGIN = 5
export const GOBLIN_SPRITE_ROWS = 13
export const GOBLIN_STAGE_HEIGHT = (GOBLIN_TOP_MARGIN + GOBLIN_SPRITE_ROWS + 2) * GOBLIN_PIXEL_UNIT
// Row 18 of 20 (TOP_MARGIN + SPRITE_ROWS) is the ground plane where feet and laptop touch the card.
export const GOBLIN_GROUND_OFFSET_PERCENT = 10

export type GoblinMotion = 'animated' | 'resting'
export type PortalSide = 'entry' | 'exit'

export interface GoblinPalette {
  readonly body: string
  readonly highlight: string
  readonly ear: string
  readonly shade: string
  readonly blush: string
  readonly ink: string
  readonly lid: string
  readonly lidLight: string
  readonly lidDark: string
  readonly deck: string
  readonly keys: string
  readonly base: string
  readonly logo: string
  readonly glyph: string
  readonly shadowOpacity: number
  readonly portalGlow: string
  readonly portalRim: string
  readonly portalCore: string
}

export interface PixelRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly fill: string
}

export interface TimelineSpec {
  readonly dur: string
  readonly values: string
  readonly keyTimes: string
  readonly calcMode?: 'spline' | 'discrete'
  readonly keySplines?: string
  readonly begin?: string
}

export interface TypingHandSpec {
  readonly rects: readonly PixelRect[]
  readonly tap: TimelineSpec
}

export interface CodeGlyphSpec {
  readonly text: string
  readonly x: number
  readonly y: number
  readonly restingY: number
  readonly begin: string
  readonly opacityValues: string
  readonly translateValues: string
  readonly dur: string
}

export interface PortalParticleSpec {
  readonly rect: PixelRect
  readonly motion: TimelineSpec
  readonly opacity: TimelineSpec
}

export interface PortalSpec {
  readonly side: PortalSide
  readonly x: number
  readonly y: number
  readonly pivotX: number
  readonly pivotY: number
  readonly rects: readonly PixelRect[]
  readonly rimRects: readonly PixelRect[]
  readonly coreRects: readonly PixelRect[]
  readonly particles: readonly PortalParticleSpec[]
  readonly scale: TimelineSpec
  readonly rimScale: TimelineSpec
  readonly coreScale: TimelineSpec
  readonly opacity: TimelineSpec
  readonly corePulse: TimelineSpec
}

export interface PortalsLayer {
  readonly clipX: number
  readonly clipWidth: number
  readonly entry: PortalSpec
  readonly exit: PortalSpec
}

export interface GoblinScene {
  readonly width: number
  readonly height: number
  readonly startX: number
  readonly stopX: number
  readonly exitX: number
  readonly topY: number
  readonly palette: GoblinPalette
  readonly travel: TimelineSpec
  readonly portals: PortalsLayer
  readonly shadow: {
    readonly cy: number
    readonly ry: number
    readonly restingCx: number
    readonly restingRx: number
    readonly initialCx: number
    readonly initialRx: number
    readonly rx: TimelineSpec
    readonly cx: TimelineSpec
  }
  readonly body: {
    readonly rects: readonly PixelRect[]
    readonly closedEyes: readonly PixelRect[]
    readonly openedEyes: readonly PixelRect[]
    readonly closedEyesVisible: TimelineSpec
    readonly openedEyesVisible: TimelineSpec
    readonly eyeGlance: TimelineSpec
    readonly lean: TimelineSpec
    readonly bounce: TimelineSpec
  }
  readonly legs: {
    readonly left: readonly PixelRect[]
    readonly right: readonly PixelRect[]
    readonly leftStep: TimelineSpec
    readonly rightStep: TimelineSpec
  }
  readonly laptop: {
    readonly deck: readonly PixelRect[]
    readonly closedLid: readonly PixelRect[]
    readonly openLid: readonly PixelRect[]
    readonly holdingHand: readonly PixelRect[]
    readonly pivotX: number
    readonly pivotY: number
    readonly motion: TimelineSpec
    readonly lidSwing: TimelineSpec
    readonly closedLidVisible: TimelineSpec
    readonly holdingVisible: TimelineSpec
    readonly behindVisible: TimelineSpec
    readonly inFrontVisible: TimelineSpec
  }
  readonly typingHands: {
    readonly hands: readonly TypingHandSpec[]
    readonly visible: TimelineSpec
  }
  readonly glyphs: {
    readonly items: readonly CodeGlyphSpec[]
    readonly visible: TimelineSpec
  }
}

const EASE_OUT = '0 0 0.58 1'
const EASE_IN = '0.42 0 1 1'
const EASE_IN_OUT = '0.42 0 0.58 1'
const LINEAR = '0 0 1 1'

const WALK_END = 0.2
const REACH = [0.21, 0.24] as const
const PULL = [0.24, 0.28, 0.32] as const
const LID_OPEN = [0.32, 0.36] as const
const TYPING = [0.36, 0.62] as const
const LOOK = [0.62, 0.74] as const
const LID_CLOSE = [0.76, 0.8] as const
const STASH = [0.8, 0.84, 0.88] as const
const RUN = [0.89, 0.97] as const
const STEP_SECONDS = 0.08
const TAP_SECONDS = 0.14

const GAIT_WINDOWS: readonly (readonly [number, number, number])[] = [
  [0, WALK_END, STEP_SECONDS],
  [RUN[0], RUN[1], STEP_SECONDS],
]

const LAPTOP_X = 14
const BEHIND = [-11, -2] as const
const BESIDE = [7, -2] as const
const RESTING = [0, 0] as const

const HALF_SPRITE = [
  '........gggg',
  'gg....gggggg',
  '.eeh.ggggggg',
  '..eehggggggg',
  '...eeggggggg',
  '....gggggggg',
  '....gggggggg',
  '....gggggggg',
  '....sggggggg',
  '....sggggggg',
  '.....sgggggg',
] as const

const LIGHT_PALETTE: GoblinPalette = {
  body: '#82a353',
  highlight: '#9cbf63',
  ear: '#b3d47a',
  shade: '#5f7d3a',
  blush: '#e69a80',
  ink: '#1f2328',
  lid: '#7d7873',
  lidLight: '#c4beb8',
  lidDark: '#55504c',
  deck: '#a8a29c',
  keys: '#45413e',
  base: '#5e5955',
  logo: '#efeae5',
  glyph: '#9a6b2f',
  shadowOpacity: 0.18,
  portalGlow: '#90caf9',
  portalRim: '#1976d2',
  portalCore: '#fff8e1',
}

const DARK_PALETTE: GoblinPalette = {
  body: '#82a353',
  highlight: '#9cbf63',
  ear: '#b3d47a',
  shade: '#5f7d3a',
  blush: '#e69a80',
  ink: '#0b0b0b',
  lid: '#7d7873',
  lidLight: '#cfc9c3',
  lidDark: '#55504c',
  deck: '#b4aea8',
  keys: '#45413e',
  base: '#5e5955',
  logo: '#efeae5',
  glyph: '#d4a373',
  shadowOpacity: 0.55,
  portalGlow: '#4b35b8',
  portalRim: '#5de0e6',
  portalCore: '#e0f7fa',
}

export const GOBLIN_PALETTES: Record<ColorMode, GoblinPalette> = {
  light: LIGHT_PALETTE,
  dark: DARK_PALETTE,
  glass: DARK_PALETTE,
}

const U = GOBLIN_PIXEL_UNIT

export const formatKeyTimes = (times: readonly number[]): string => times.map((v) => v.toFixed(4)).join(';')

export const px = (x: number, y: number, w: number, h: number, fill: string): PixelRect => ({
  x: x * U,
  y: y * U,
  width: w * U,
  height: h * U,
  fill,
})

const onTimeline = (
  values: readonly string[],
  times: readonly number[],
  splines?: readonly string[],
): TimelineSpec => ({
  dur: `${GOBLIN_LOOP_SECONDS}s`,
  values: values.join(';'),
  keyTimes: formatKeyTimes(times),
  ...(splines ? { calcMode: 'spline', keySplines: splines.join(';') } : {}),
})

export const visibleWindow = (windows: readonly (readonly [number, number])[]): TimelineSpec => {
  const values = ['0']
  const times = [0]
  for (const [start, end] of windows) {
    values.push('1')
    times.push(start)
    if (end < 1) {
      values.push('0')
      times.push(end)
    }
  }
  return {
    dur: `${GOBLIN_LOOP_SECONDS}s`,
    calcMode: 'discrete',
    values: values.join(';'),
    keyTimes: formatKeyTimes(times),
  }
}

export const beatMotion = (
  windows: readonly (readonly [number, number, number])[],
  pattern: readonly number[],
): TimelineSpec => {
  const values = ['0 0']
  const times = [0]
  for (const [start, end, beatSeconds] of windows) {
    if (start > times[times.length - 1]) {
      values.push('0 0')
      times.push(start)
    }
    const step = beatSeconds / GOBLIN_LOOP_SECONDS
    let t = start
    let k = 0
    while (t + step <= end) {
      t += step
      values.push(`0 ${pattern[k % pattern.length] * U}`)
      times.push(t)
      k += 1
    }
    if (values[values.length - 1] !== '0 0') {
      values.push('0 0')
      times.push(Math.min(t + step / 2, end))
    }
  }
  if (times[times.length - 1] < 1) {
    values.push('0 0')
    times.push(1)
  }
  return onTimeline(values, times)
}

const buildBodyPixels = (t: GoblinPalette): readonly PixelRect[] => {
  const colors: Record<string, string> = {
    g: t.body,
    h: t.highlight,
    e: t.ear,
    s: t.shade,
  }
  const parts: PixelRect[] = []
  HALF_SPRITE.forEach((half, y) => {
    const row = half + [...half].reverse().join('')
    let x = 0
    while (x < row.length) {
      const char = row[x]
      let run = 1
      while (x + run < row.length && row[x + run] === char) {
        run += 1
      }
      if (char in colors) {
        parts.push(px(x, y, run, 1, colors[char]))
      }
      x += run
    }
  })
  parts.push(px(6, 7, 1, 1, t.blush), px(17, 7, 1, 1, t.blush), px(11, 7, 2, 1, t.ink))
  return parts
}

const stubHand = (t: GoblinPalette, x: number, y: number): readonly PixelRect[] => [
  px(x, y, 2, 2, t.body),
  px(x, y + 1, 2, 1, t.shade),
]

const buildLaptopOpenLid = (t: GoblinPalette): readonly PixelRect[] => {
  const x = LAPTOP_X
  const lidRows: PixelRect[] = []
  for (let row = 3; row < 11; row += 1) {
    const x0 = x + 7 + Math.floor((10 - row) / 2)
    if (row === 3) {
      lidRows.push(px(x0, row, 8, 1, t.lidLight))
    } else {
      lidRows.push(px(x0, row, 1, 1, t.lidLight), px(x0 + 1, row, 6, 1, t.lid), px(x0 + 7, row, 1, 1, t.lidDark))
    }
  }
  const cx = x + 13
  lidRows.push(px(cx, 5, 1, 1, t.logo), px(cx - 1, 6, 3, 1, t.logo), px(cx, 7, 1, 1, t.logo))
  return lidRows
}

const makeParticle = (
  rect: PixelRect,
  dx1: number,
  dy1: number,
  dx2: number,
  dy2: number,
  openStart: number,
  closeEnd: number,
  phaseOffset: number,
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
    ),
    opacity: onTimeline(
      ['0.72', '0.72', '1', '0.72', '1', '0.72', '0.72'],
      [0, openStart, t1, t2, t3, closeEnd, 1],
      [LINEAR, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, LINEAR],
    ),
  }
}

const buildRingScale = (openStart: number, openEnd: number, closeStart: number, closeEnd: number): TimelineSpec =>
  onTimeline(
    ['0 0', '0 0', '1 1', '1 1', '0 0', '0 0'],
    [0, openStart, openEnd, closeStart, closeEnd, 1],
    [LINEAR, EASE_OUT, LINEAR, EASE_IN, LINEAR],
  )

const buildPortalSpec = (
  side: PortalSide,
  portalX: number,
  portalY: number,
  palette: GoblinPalette,
  openStart: number,
  openFull: number,
  closeStart: number,
  closeEnd: number,
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
  )
  const rimScale = buildRingScale(
    Number((openStart + openSpan * 0.18).toFixed(4)),
    Number((openStart + openSpan * 0.82).toFixed(4)),
    Number((closeStart + closeSpan * 0.18).toFixed(4)),
    Number((closeEnd - closeSpan * 0.18).toFixed(4)),
  )
  const scale = buildRingScale(
    Number((openStart + openSpan * 0.36).toFixed(4)),
    openFull,
    closeStart,
    Number((closeEnd - closeSpan * 0.36).toFixed(4)),
  )

  const opacity = visibleWindow([[openStart, closeEnd]])

  const pulseT1 = Number((openStart + (closeEnd - openStart) * 0.25).toFixed(4))
  const pulseT2 = Number((openStart + (closeEnd - openStart) * 0.5).toFixed(4))
  const pulseT3 = Number((openStart + (closeEnd - openStart) * 0.75).toFixed(4))
  const corePulse = onTimeline(
    ['1', '1', '0.86', '1', '0.86', '1', '1'],
    [0, openStart, pulseT1, pulseT2, pulseT3, closeEnd, 1],
    [LINEAR, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, LINEAR],
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
    particles,
    scale,
    rimScale,
    coreScale,
    opacity,
    corePulse,
  }
}

export const buildGoblinScene = (mode: ColorMode, width = GOBLIN_STAGE_WIDTH): GoblinScene => {
  const t = GOBLIN_PALETTES[mode]
  const startX = -45 * U
  const stopX = Math.floor(width / 2) - 15 * U
  const exitX = width + 10 * U
  const topY = GOBLIN_TOP_MARGIN * U

  const portalMargin = 6 * U
  const entryPortalX = portalMargin
  const exitPortalX = width - portalMargin
  // Row 9 (y = 27) centers the 17-row tall portal so it towers above the goblin (y = 3) and lands on y = 54.
  const portalCenterY = 9 * U

  const entrySpan = stopX - startX
  const tEntryClear = WALK_END * ((entryPortalX + 3 - startX) / entrySpan)
  const entryPortal = buildPortalSpec(
    'entry',
    entryPortalX,
    portalCenterY,
    t,
    0.002,
    0.044,
    tEntryClear + 0.075,
    tEntryClear + 0.123,
  )

  const exitSpan = exitX - stopX
  const tExitTouch = RUN[0] + (RUN[1] - RUN[0]) * ((exitPortalX - 66 - stopX) / exitSpan)
  // Under EASE_IN (0.42, 0, 1, 1), the trailing edge clears exitPortalX at ~89.6% of RUN (t = 0.9617).
  const tExitClear = Number((RUN[0] + (RUN[1] - RUN[0]) * 0.925).toFixed(4))
  const exitPortal = buildPortalSpec(
    'exit',
    exitPortalX,
    portalCenterY,
    t,
    tExitTouch - 0.135,
    tExitTouch - 0.087,
    tExitClear,
    0.998,
  )

  const [lookStart, lookEnd] = LOOK
  const lookStep = (lookEnd - lookStart) / 4

  const laptopPoints = [BEHIND, BEHIND, BESIDE, RESTING, RESTING, BESIDE, BEHIND, BEHIND] as const
  const shadowTimes = [0, PULL[1], PULL[2], STASH[0], STASH[1], 1]

  return {
    width,
    height: GOBLIN_STAGE_HEIGHT,
    startX,
    stopX,
    exitX,
    topY,
    palette: t,
    travel: onTimeline(
      [`${startX} ${topY}`, `${stopX} ${topY}`, `${stopX} ${topY}`, `${exitX} ${topY}`, `${exitX} ${topY}`],
      [0, WALK_END, RUN[0], RUN[1], 1],
      [EASE_OUT, LINEAR, EASE_IN, LINEAR],
    ),
    portals: {
      clipX: entryPortalX,
      clipWidth: exitPortalX - entryPortalX,
      entry: entryPortal,
      exit: exitPortal,
    },
    shadow: {
      cy: 13 * U,
      ry: U,
      initialCx: 12 * U,
      initialRx: 13 * U,
      restingCx: 16 * U,
      restingRx: 17 * U,
      rx: onTimeline(
        [13, 13, 17, 17, 13, 13].map((v) => `${v * U}`),
        shadowTimes,
      ),
      cx: onTimeline(
        [12, 12, 16, 16, 12, 12].map((v) => `${v * U}`),
        shadowTimes,
      ),
    },
    body: {
      rects: buildBodyPixels(t),
      closedEyes: [
        px(6, 6, 1, 1, t.ink),
        px(7, 5, 2, 1, t.ink),
        px(9, 6, 1, 1, t.ink),
        px(14, 6, 1, 1, t.ink),
        px(15, 5, 2, 1, t.ink),
        px(17, 6, 1, 1, t.ink),
      ],
      openedEyes: [px(7, 5, 2, 2, t.ink), px(15, 5, 2, 2, t.ink)],
      closedEyesVisible: visibleWindow([
        [0, lookStart],
        [lookEnd, 1],
      ]),
      openedEyesVisible: visibleWindow([[lookStart, lookEnd]]),
      eyeGlance: onTimeline(
        ['0 0', '0 0', `${-U} 0`, `${U} 0`, `${-U} 0`, '0 0', '0 0'],
        [0, lookStart, lookStart + lookStep, lookStart + 2 * lookStep, lookStart + 3 * lookStep, lookEnd, 1],
        [LINEAR, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, EASE_IN_OUT, LINEAR],
      ),
      lean: onTimeline(
        ['0 0', '0 0', `${U} 0`, `${U} 0`, '0 0', '0 0', `${U} 0`, '0 0', '0 0'],
        [0, REACH[0], REACH[1], PULL[1], PULL[2], STASH[1], STASH[1] + 0.02, STASH[2], 1],
        [LINEAR, EASE_OUT, LINEAR, EASE_IN_OUT, LINEAR, EASE_OUT, EASE_IN_OUT, LINEAR],
      ),
      bounce: beatMotion([GAIT_WINDOWS[0], [TYPING[0], TYPING[1], TAP_SECONDS], GAIT_WINDOWS[1]], [-1, 0]),
    },
    legs: {
      left: [px(6, 10, 2, 3, t.body), px(6, 12, 2, 1, t.shade)],
      right: [px(16, 10, 2, 3, t.body), px(16, 12, 2, 1, t.shade)],
      leftStep: beatMotion(GAIT_WINDOWS, [-1, 0, 0, 0]),
      rightStep: beatMotion(GAIT_WINDOWS, [0, 0, -1, 0]),
    },
    laptop: {
      deck: [
        px(LAPTOP_X, 11, 16, 1, t.deck),
        px(LAPTOP_X + 1, 11, 1, 1, t.keys),
        px(LAPTOP_X + 3, 11, 1, 1, t.keys),
        px(LAPTOP_X + 5, 11, 1, 1, t.keys),
        px(LAPTOP_X - 1, 12, 17, 1, t.base),
      ],
      closedLid: [px(LAPTOP_X + 1, 10, 15, 1, t.lid), px(LAPTOP_X + 1, 10, 1, 1, t.lidLight)],
      openLid: buildLaptopOpenLid(t),
      holdingHand: stubHand(t, LAPTOP_X - 2, 9),
      pivotX: 0,
      pivotY: 11 * U,
      motion: onTimeline(
        laptopPoints.map(([dx, dy]) => `${dx * U} ${dy * U}`),
        [0, PULL[0], PULL[1], PULL[2], STASH[0], STASH[1], STASH[2], 1],
        [LINEAR, EASE_OUT, EASE_IN_OUT, LINEAR, EASE_IN_OUT, EASE_IN, LINEAR],
      ),
      lidSwing: onTimeline(
        ['1 0', '1 0', '1 1', '1 1', '1 0', '1 0'],
        [0, LID_OPEN[0], LID_OPEN[1], LID_CLOSE[0], LID_CLOSE[1], 1],
        [LINEAR, EASE_OUT, LINEAR, EASE_IN, LINEAR],
      ),
      closedLidVisible: visibleWindow([
        [0, LID_OPEN[0] + 0.01],
        [LID_CLOSE[1] - 0.01, 1],
      ]),
      holdingVisible: visibleWindow([
        [PULL[0], PULL[2]],
        [STASH[0], STASH[2]],
      ]),
      behindVisible: visibleWindow([
        [PULL[0], PULL[1]],
        [STASH[1], STASH[2]],
      ]),
      inFrontVisible: visibleWindow([[PULL[1], STASH[1]]]),
    },
    typingHands: {
      hands: [LAPTOP_X + 1, LAPTOP_X + 4].map((x, i) => ({
        rects: stubHand(t, x, 10),
        tap: {
          dur: `${2 * TAP_SECONDS}s`,
          begin: `${(i * TAP_SECONDS).toFixed(2).replace(/0$/, '')}s`,
          values: `0 0;0 ${U};0 0`,
          keyTimes: '0;0.5;1',
          calcMode: 'spline',
          keySplines: `${EASE_IN_OUT};${EASE_IN_OUT}`,
        },
      })),
      visible: visibleWindow([[LID_OPEN[1] - 0.01, LID_CLOSE[0]]]),
    },
    glyphs: {
      items: (['{}', '</>', ';'] as const).map((text, i) => ({
        text,
        x: (LAPTOP_X + 6 + i * 4) * U,
        y: -1 * U,
        restingY: (-1 - (i % 2)) * U,
        begin: `${(i * 0.4).toFixed(1)}s`,
        opacityValues: '0;1;0',
        translateValues: '0 6;0 -6',
        dur: '1.2s',
      })),
      visible: visibleWindow([TYPING]),
    },
  }
}
