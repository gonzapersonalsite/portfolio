import type { ColorMode } from '@/shared/config'
import {
  EASE_IN,
  EASE_IN_OUT,
  EASE_OUT,
  GOBLIN_GROUND_OFFSET_PERCENT,
  GOBLIN_LOOP_SECONDS,
  GOBLIN_LOST_LOOP_SECONDS,
  GOBLIN_PALETTES,
  GOBLIN_PIXEL_UNIT,
  GOBLIN_SPRITE_ROWS,
  GOBLIN_STAGE_HEIGHT,
  GOBLIN_STAGE_WIDTH,
  GOBLIN_TOP_MARGIN,
  LAPTOP_X,
  LINEAR,
  beatMotion,
  buildBodyPixels,
  buildClosedEyes,
  buildLaptopOpenLid,
  buildLegPixels,
  buildOpenedEyes,
  formatKeyTimes,
  onTimeline,
  px,
  stubHand,
  visibleWindow,
  type CodeGlyphSpec,
  type GoblinMotion,
  type GoblinPalette,
  type GoblinScene,
  type GoblinVariant,
  type PixelRect,
  type PortalBeckonSpec,
  type PortalParticleSpec,
  type PortalRippleSpec,
  type PortalSide,
  type PortalSpec,
  type PortalsLayer,
  type TimelineSpec,
  type TypingHandSpec,
} from './goblinPrimitives'
import { buildExitBeckonSpec, buildPortalSpec } from './portalSpec'

export {
  GOBLIN_GROUND_OFFSET_PERCENT,
  GOBLIN_LOOP_SECONDS,
  GOBLIN_LOST_LOOP_SECONDS,
  GOBLIN_PALETTES,
  GOBLIN_PIXEL_UNIT,
  GOBLIN_SPRITE_ROWS,
  GOBLIN_STAGE_HEIGHT,
  GOBLIN_STAGE_WIDTH,
  GOBLIN_TOP_MARGIN,
  beatMotion,
  formatKeyTimes,
  px,
  visibleWindow,
}
export type {
  CodeGlyphSpec,
  GoblinMotion,
  GoblinPalette,
  GoblinScene,
  GoblinVariant,
  PixelRect,
  PortalBeckonSpec,
  PortalParticleSpec,
  PortalRippleSpec,
  PortalSide,
  PortalSpec,
  PortalsLayer,
  TimelineSpec,
  TypingHandSpec,
}

const U = GOBLIN_PIXEL_UNIT

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

const BEHIND = [-11, -2] as const
const BESIDE = [7, -2] as const
const RESTING = [0, 0] as const

interface StageGeometry {
  readonly width: number
  readonly startX: number
  readonly stopX: number
  readonly exitX: number
  readonly topY: number
  readonly entryPortalX: number
  readonly exitPortalX: number
  readonly portalCenterY: number
  readonly entrySpan: number
  readonly exitSpan: number
  readonly palette: GoblinPalette
}

const buildCodingScene = (stage: StageGeometry): GoblinScene => {
  const {
    width,
    startX,
    stopX,
    exitX,
    topY,
    entryPortalX,
    exitPortalX,
    portalCenterY,
    entrySpan,
    exitSpan,
    palette: t,
  } = stage

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
      closedEyes: buildClosedEyes(t),
      openedEyes: buildOpenedEyes(t),
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
      left: buildLegPixels(t, 6),
      right: buildLegPixels(t, 16),
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

const buildLostScene = (stage: StageGeometry): GoblinScene => {
  const { width, startX, stopX, exitX, topY, entryPortalX, exitPortalX, portalCenterY, entrySpan, palette: t } = stage

  const L = GOBLIN_LOST_LOOP_SECONDS
  const lostWalkEnd = 0.14
  const lostRunStart = 0.83
  const lostRunEnd = 0.96
  const paceLeftX = stopX - 16 * U
  const paceRightX = stopX + 14 * U

  const lostEntryClear = lostWalkEnd * ((entryPortalX + 3 - startX) / entrySpan)
  const lostEntryPortal = buildPortalSpec(
    'entry',
    entryPortalX,
    portalCenterY,
    t,
    0.002,
    0.032,
    lostEntryClear + 0.05,
    lostEntryClear + 0.085,
    L,
  )

  // Exit portal opens early (t = 0.695) so the beckoning hand can reach out and call the lost goblin home.
  const lostExitPortal = buildPortalSpec('exit', exitPortalX, portalCenterY, t, 0.695, 0.725, 0.955, 0.995, L)
  const beckon = buildExitBeckonSpec(exitPortalX, portalCenterY, t, L)

  const lostGaitWindows: readonly (readonly [number, number, number])[] = [
    [0, lostWalkEnd, STEP_SECONDS],
    [0.2, 0.3, STEP_SECONDS],
    [0.36, 0.48, STEP_SECONDS],
    [0.55, 0.66, STEP_SECONDS],
    [lostRunStart, lostRunEnd, STEP_SECONDS],
  ]
  const hiddenTimeline: TimelineSpec = {
    dur: `${L}s`,
    calcMode: 'discrete',
    values: '0;0',
    keyTimes: '0.0000;1.0000',
  }

  return {
    width,
    height: GOBLIN_STAGE_HEIGHT,
    startX,
    stopX,
    exitX,
    topY,
    palette: t,
    travel: onTimeline(
      [
        `${startX} ${topY}`,
        `${stopX} ${topY}`,
        `${stopX} ${topY}`,
        `${paceLeftX} ${topY}`,
        `${paceLeftX} ${topY}`,
        `${paceRightX} ${topY}`,
        `${paceRightX} ${topY}`,
        `${paceLeftX} ${topY}`,
        `${paceLeftX} ${topY}`,
        `${exitX} ${topY}`,
        `${exitX} ${topY}`,
      ],
      [0, lostWalkEnd, 0.2, 0.3, 0.36, 0.48, 0.55, 0.66, lostRunStart, lostRunEnd, 1],
      [EASE_OUT, LINEAR, EASE_IN_OUT, LINEAR, EASE_IN_OUT, LINEAR, EASE_IN_OUT, LINEAR, EASE_IN, LINEAR],
      L,
    ),
    portals: {
      clipX: entryPortalX,
      clipWidth: exitPortalX - entryPortalX,
      entry: lostEntryPortal,
      exit: lostExitPortal,
      beckon,
    },
    shadow: {
      cy: 13 * U,
      ry: U,
      initialCx: 12 * U,
      initialRx: 13 * U,
      restingCx: 12 * U,
      restingRx: 13 * U,
      rx: onTimeline([`${13 * U}`, `${13 * U}`], [0, 1], undefined, L),
      cx: onTimeline([`${12 * U}`, `${12 * U}`], [0, 1], undefined, L),
    },
    body: {
      rects: buildBodyPixels(t),
      closedEyes: buildClosedEyes(t),
      openedEyes: buildOpenedEyes(t),
      closedEyesVisible: visibleWindow(
        [
          [0, lostWalkEnd],
          [0.92, 1],
        ],
        L,
      ),
      openedEyesVisible: visibleWindow([[lostWalkEnd, 0.92]], L),
      eyeGlance: onTimeline(
        [
          '0 0',
          '0 0',
          `${-U} 0`,
          `${-U} 0`,
          `${U} 0`,
          `${U} 0`,
          `0 ${-U}`,
          `${-U} 0`,
          `${-U} 0`,
          `${U} 0`,
          `${U} 0`,
          '0 0',
        ],
        [0, lostWalkEnd, 0.22, 0.34, 0.42, 0.52, 0.56, 0.64, 0.77, 0.785, 0.92, 1],
        [LINEAR, EASE_IN_OUT, LINEAR, EASE_IN_OUT, LINEAR, EASE_IN_OUT, EASE_IN_OUT, LINEAR, EASE_OUT, LINEAR, LINEAR],
        L,
      ),
      lean: onTimeline(
        ['0 0', '0 0', `${-U} 0`, `${U} 0`, `0 ${-U}`, `${-U} 0`, `${-U} 0`, `0 ${-2 * U}`, `${U} 0`, '0 0', '0 0'],
        [0, 0.2, 0.3, 0.48, 0.53, 0.65, 0.775, 0.795, 0.82, 0.94, 1],
        [LINEAR, EASE_IN_OUT, EASE_IN_OUT, EASE_OUT, EASE_IN_OUT, LINEAR, EASE_OUT, EASE_IN, EASE_IN_OUT, LINEAR],
        L,
      ),
      bounce: beatMotion([...lostGaitWindows, [0.66, 0.77, 0.2]], [-1, 0], L),
    },
    legs: {
      left: buildLegPixels(t, 6),
      right: buildLegPixels(t, 16),
      leftStep: beatMotion(lostGaitWindows, [-1, 0, 0, 0], L),
      rightStep: beatMotion(lostGaitWindows, [0, 0, -1, 0], L),
    },
    laptop: {
      deck: [],
      closedLid: [],
      openLid: [],
      holdingHand: [],
      pivotX: 0,
      pivotY: 11 * U,
      motion: onTimeline(['0 0', '0 0'], [0, 1], undefined, L),
      lidSwing: onTimeline(['1 0', '1 0'], [0, 1], undefined, L),
      closedLidVisible: hiddenTimeline,
      holdingVisible: hiddenTimeline,
      behindVisible: hiddenTimeline,
      inFrontVisible: hiddenTimeline,
    },
    typingHands: {
      hands: [3, 19].map((x, i) => ({
        rects: stubHand(t, x, 6),
        tap: {
          dur: '0.42s',
          begin: `${(i * 0.21).toFixed(2)}s`,
          values: `0 0;0 ${-U};0 0`,
          keyTimes: '0;0.5;1',
          calcMode: 'spline',
          keySplines: `${EASE_IN_OUT};${EASE_IN_OUT}`,
        },
      })),
      visible: visibleWindow(
        [
          [0.14, 0.2],
          [0.3, 0.36],
          [0.48, 0.55],
          [0.66, 0.825],
        ],
        L,
      ),
    },
    glyphs: {
      items: (['?', '404', '?!'] as const).map((text, i) => ({
        text,
        x: (4 + i * 7) * U,
        y: -1 * U,
        restingY: (-1 - (i % 2)) * U,
        begin: `${(i * 0.45).toFixed(2)}s`,
        opacityValues: '0;1;0',
        translateValues: '0 6;0 -6',
        dur: '1.35s',
      })),
      visible: visibleWindow([[0.15, 0.77]], L),
      alert: {
        text: '!',
        x: 11 * U,
        y: -2 * U,
        visible: visibleWindow([[0.775, 0.855]], L),
        bounce: onTimeline(
          ['0 0', '0 0', `0 ${-2 * U}`, '0 0', '0 0'],
          [0, 0.775, 0.795, 0.82, 1],
          [LINEAR, EASE_OUT, EASE_IN, LINEAR],
          L,
        ),
      },
    },
  }
}

const SCENE_BUILDERS: Record<GoblinVariant, (stage: StageGeometry) => GoblinScene> = {
  coding: buildCodingScene,
  lost: buildLostScene,
}

export const buildGoblinScene = (
  mode: ColorMode,
  width = GOBLIN_STAGE_WIDTH,
  variant: GoblinVariant = 'coding',
): GoblinScene => {
  const palette = GOBLIN_PALETTES[mode]
  const startX = -45 * U
  const stopX = Math.floor(width / 2) - 15 * U
  const exitX = width + 10 * U
  const topY = GOBLIN_TOP_MARGIN * U

  const portalMargin = 6 * U
  const entryPortalX = portalMargin
  const exitPortalX = width - portalMargin
  // Row 9 (y = 27) centers the 17-row tall portal so it towers above the goblin (y = 3) and lands on y = 54.
  const portalCenterY = 9 * U

  const stage: StageGeometry = {
    width,
    startX,
    stopX,
    exitX,
    topY,
    entryPortalX,
    exitPortalX,
    portalCenterY,
    entrySpan: stopX - startX,
    exitSpan: exitX - stopX,
    palette,
  }

  return SCENE_BUILDERS[variant](stage)
}
