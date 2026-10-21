import type { ColorMode } from '@/shared/config'

export const GOBLIN_PIXEL_UNIT = 3
export const GOBLIN_LOOP_SECONDS = 16
export const GOBLIN_LOST_LOOP_SECONDS = 24
export const GOBLIN_STAGE_WIDTH = 384
export const GOBLIN_TOP_MARGIN = 5
export const GOBLIN_SPRITE_ROWS = 13
export const GOBLIN_STAGE_HEIGHT = (GOBLIN_TOP_MARGIN + GOBLIN_SPRITE_ROWS + 2) * GOBLIN_PIXEL_UNIT
// Row 18 of 20 (TOP_MARGIN + SPRITE_ROWS) is the ground plane where feet and laptop touch the card.
export const GOBLIN_GROUND_OFFSET_PERCENT = 10

export const EASE_OUT = '0 0 0.58 1'
export const EASE_IN = '0.42 0 1 1'
export const EASE_IN_OUT = '0.42 0 0.58 1'
export const LINEAR = '0 0 1 1'

export const LAPTOP_X = 14

export type GoblinMotion = 'animated' | 'resting'
export type GoblinVariant = 'coding' | 'lost'
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

export interface PortalRippleSpec {
  readonly rect: PixelRect
  readonly opacity: TimelineSpec
  readonly fill: TimelineSpec
}

export interface PortalBeckonSpec {
  readonly x: number
  readonly y: number
  readonly armRects: readonly PixelRect[]
  readonly fingerRects: readonly PixelRect[]
  readonly reach: TimelineSpec
  readonly fingerWave: TimelineSpec
  readonly visible: TimelineSpec
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
  readonly ripples: readonly PortalRippleSpec[]
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
  readonly beckon?: PortalBeckonSpec
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
    readonly alert?: {
      readonly text: string
      readonly x: number
      readonly y: number
      readonly visible: TimelineSpec
      readonly bounce: TimelineSpec
    }
  }
}

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

export const onTimeline = (
  values: readonly string[],
  times: readonly number[],
  splines?: readonly string[],
  loopSeconds = GOBLIN_LOOP_SECONDS,
): TimelineSpec => ({
  dur: `${loopSeconds}s`,
  values: values.join(';'),
  keyTimes: formatKeyTimes(times),
  ...(splines ? { calcMode: 'spline', keySplines: splines.join(';') } : {}),
})

export const visibleWindow = (
  windows: readonly (readonly [number, number])[],
  loopSeconds = GOBLIN_LOOP_SECONDS,
): TimelineSpec => {
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
    dur: `${loopSeconds}s`,
    calcMode: 'discrete',
    values: values.join(';'),
    keyTimes: formatKeyTimes(times),
  }
}

export const beatMotion = (
  windows: readonly (readonly [number, number, number])[],
  pattern: readonly number[],
  loopSeconds = GOBLIN_LOOP_SECONDS,
): TimelineSpec => {
  const values = ['0 0']
  const times = [0]
  for (const [start, end, beatSeconds] of windows) {
    if (start > times[times.length - 1]) {
      values.push('0 0')
      times.push(start)
    }
    const step = beatSeconds / loopSeconds
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
  return onTimeline(values, times, undefined, loopSeconds)
}

export const buildBodyPixels = (t: GoblinPalette): readonly PixelRect[] => {
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

export const buildClosedEyes = (t: GoblinPalette): readonly PixelRect[] => [
  px(6, 6, 1, 1, t.ink),
  px(7, 5, 2, 1, t.ink),
  px(9, 6, 1, 1, t.ink),
  px(14, 6, 1, 1, t.ink),
  px(15, 5, 2, 1, t.ink),
  px(17, 6, 1, 1, t.ink),
]

export const buildOpenedEyes = (t: GoblinPalette): readonly PixelRect[] => [
  px(7, 5, 2, 2, t.ink),
  px(15, 5, 2, 2, t.ink),
]

export const buildLegPixels = (t: GoblinPalette, x: number): readonly PixelRect[] => [
  px(x, 10, 2, 3, t.body),
  px(x, 12, 2, 1, t.shade),
]

export const stubHand = (t: GoblinPalette, x: number, y: number): readonly PixelRect[] => [
  px(x, y, 2, 2, t.body),
  px(x, y + 1, 2, 1, t.shade),
]

export const buildLaptopOpenLid = (t: GoblinPalette): readonly PixelRect[] => {
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
