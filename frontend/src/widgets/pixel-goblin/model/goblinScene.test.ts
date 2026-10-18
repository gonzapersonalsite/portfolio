import { describe, expect, it } from 'vitest'
import {
  GOBLIN_GROUND_OFFSET_PERCENT,
  GOBLIN_PALETTES,
  GOBLIN_PIXEL_UNIT,
  GOBLIN_SPRITE_ROWS,
  GOBLIN_STAGE_HEIGHT,
  GOBLIN_STAGE_WIDTH,
  GOBLIN_TOP_MARGIN,
  beatMotion,
  buildGoblinScene,
  formatKeyTimes,
  px,
  visibleWindow,
} from './goblinScene'

describe('goblinScene', () => {
  it('places the ground line at row 18 of 20 so a 10% downward offset aligns the feet on the card border', () => {
    const groundRow = GOBLIN_TOP_MARGIN + GOBLIN_SPRITE_ROWS
    const groundY = groundRow * GOBLIN_PIXEL_UNIT
    expect(groundY).toBe(54)
    expect(GOBLIN_STAGE_HEIGHT).toBe(60)
    expect(((GOBLIN_STAGE_HEIGHT - groundY) / GOBLIN_STAGE_HEIGHT) * 100).toBe(GOBLIN_GROUND_OFFSET_PERCENT)
  })

  it.each([
    ['light', '#1f2328', '#c4beb8', '#a8a29c', '#9a6b2f', 0.18, '#90caf9', '#1976d2', '#fff8e1'],
    ['dark', '#0b0b0b', '#cfc9c3', '#b4aea8', '#d4a373', 0.55, '#4b35b8', '#5de0e6', '#e0f7fa'],
    ['glass', '#0b0b0b', '#cfc9c3', '#b4aea8', '#d4a373', 0.55, '#4b35b8', '#5de0e6', '#e0f7fa'],
  ] as const)(
    'selects the %s palette matching the profile README and portal theme colors',
    (mode, ink, lidLight, deck, glyph, shadow, portalGlow, portalRim, portalCore) => {
      const scene = buildGoblinScene(mode)
      expect(scene.palette).toEqual(GOBLIN_PALETTES[mode])
      expect(scene.palette.ink).toBe(ink)
      expect(scene.palette.lidLight).toBe(lidLight)
      expect(scene.palette.deck).toBe(deck)
      expect(scene.palette.glyph).toBe(glyph)
      expect(scene.palette.shadowOpacity).toBe(shadow)
      expect(scene.palette.portalGlow).toBe(portalGlow)
      expect(scene.palette.portalRim).toBe(portalRim)
      expect(scene.palette.portalCore).toBe(portalCore)
    },
  )

  it('centers the resting goblin and laptop on the stage and computes travel keyframes', () => {
    const scene = buildGoblinScene('dark', 560)
    expect(scene.startX).toBe(-135)
    expect(scene.stopX).toBe(235)
    expect(scene.exitX).toBe(590)
    expect(scene.topY).toBe(15)
    expect(scene.travel.values).toBe('-135 15;235 15;235 15;590 15;590 15')
    expect(scene.travel.keyTimes).toBe('0.0000;0.2000;0.8900;0.9700;1.0000')

    const cardScene = buildGoblinScene('light')
    expect(cardScene.width).toBe(GOBLIN_STAGE_WIDTH)
    expect(cardScene.stopX).toBe(GOBLIN_STAGE_WIDTH / 2 - 45)
  })

  it('places symmetric 2D pixel portals that open inside-out from the epicenter, close outside-in, and oscillate smoothly', () => {
    const scene = buildGoblinScene('dark')

    expect(scene.portals.entry.side).toBe('entry')
    expect(scene.portals.exit.side).toBe('exit')
    expect(scene.portals.entry.x).toBe(18)
    expect(scene.portals.exit.x).toBe(366)
    expect(scene.portals.entry.y).toBe(27)
    expect(scene.portals.exit.y).toBe(27)
    expect(scene.portals.entry.pivotX).toBe(1.5)
    expect(scene.portals.entry.pivotY).toBe(1.5)
    expect(scene.portals.clipX).toBe(18)
    expect(scene.portals.clipWidth).toBe(348)

    // Inside-out opening (core -> rim -> outer) and outside-in closing (outer -> rim -> core) on entry portal.
    expect(scene.portals.entry.coreScale.values).toBe('0 0;0 0;1 1;1 1;0 0;0 0')
    expect(scene.portals.entry.coreScale.keyTimes).toBe('0.0000;0.0020;0.0289;0.2029;0.2336;1.0000')
    expect(scene.portals.entry.rimScale.keyTimes).toBe('0.0000;0.0096;0.0364;0.1943;0.2250;1.0000')
    expect(scene.portals.entry.scale.keyTimes).toBe('0.0000;0.0171;0.0440;0.1856;0.2164;1.0000')
    expect(scene.portals.entry.opacity.values).toBe('0;1;0')
    expect(scene.portals.entry.corePulse.dur).toBe('16s')
    expect(scene.portals.entry.corePulse.calcMode).toBe('spline')
    expect(scene.portals.entry.particles).toHaveLength(8)
    expect(scene.portals.entry.particles[0].motion.dur).toBe('16s')
    expect(scene.portals.entry.particles[0].opacity.dur).toBe('16s')
    expect(scene.portals.entry.particles[0].opacity.calcMode).toBe('spline')

    // Inside-out opening and outside-in closing on exit portal (closing starts at 0.9640 after EASE_IN crossing).
    expect(scene.portals.exit.coreScale.keyTimes).toBe('0.0000;0.8008;0.8316;0.9762;0.9980;1.0000')
    expect(scene.portals.exit.rimScale.keyTimes).toBe('0.0000;0.8095;0.8402;0.9701;0.9919;1.0000')
    expect(scene.portals.exit.scale.keyTimes).toBe('0.0000;0.8181;0.8488;0.9640;0.9858;1.0000')
    expect(scene.portals.exit.opacity.values).toBe('0;1;0')
    expect(scene.portals.exit.particles).toHaveLength(8)

    const topGlowRect = scene.portals.entry.rects[0]
    expect(scene.portals.entry.y + topGlowRect.y).toBe(3)
    const baseCoreRect = scene.portals.entry.coreRects[scene.portals.entry.coreRects.length - 1]
    expect(scene.portals.entry.y + baseCoreRect.y + baseCoreRect.height).toBe(54)
  })

  it('builds the mirrored pixel sprite, laptop layers, hands, glyphs and shadow identically to render_goblin.py', () => {
    const scene = buildGoblinScene('light', 560)

    expect(scene.body.rects[0]).toEqual(px(8, 0, 8, 1, '#82a353'))
    expect(scene.body.rects[1]).toEqual(px(0, 1, 2, 1, '#82a353'))
    expect(scene.body.rects).toContainEqual(px(1, 2, 2, 1, '#b3d47a'))
    expect(scene.body.rects).toContainEqual(px(3, 2, 1, 1, '#9cbf63'))
    expect(scene.body.rects).toContainEqual(px(6, 7, 1, 1, '#e69a80'))
    expect(scene.body.rects).toContainEqual(px(17, 7, 1, 1, '#e69a80'))
    expect(scene.body.rects).toContainEqual(px(11, 7, 2, 1, '#1f2328'))
    expect(scene.body.closedEyes).toHaveLength(6)
    expect(scene.legs.left).toEqual([px(6, 10, 2, 3, '#82a353'), px(6, 12, 2, 1, '#5f7d3a')])

    expect(scene.shadow.rx.values).toBe('39;39;51;51;39;39')
    expect(scene.shadow.cx.values).toBe('36;36;48;48;36;36')
    expect(scene.shadow.restingCx).toBe(48)
    expect(scene.shadow.restingRx).toBe(51)

    expect(scene.laptop.motion.values).toBe('-33 -6;-33 -6;21 -6;0 0;0 0;21 -6;-33 -6;-33 -6')
    expect(scene.laptop.behindVisible.values).toBe('0;1;0;1;0')
    expect(scene.laptop.inFrontVisible.values).toBe('0;1;0')
    expect(scene.laptop.lidSwing.values).toBe('1 0;1 0;1 1;1 1;1 0;1 0')

    expect(scene.typingHands.hands).toHaveLength(2)
    expect(scene.typingHands.hands[0].tap.begin).toBe('0.0s')
    expect(scene.typingHands.hands[1].tap.begin).toBe('0.14s')

    expect(scene.glyphs.items.map((item) => item.text)).toEqual(['{}', '</>', ';'])
    expect(scene.glyphs.items.map((item) => item.x)).toEqual([60, 72, 84])
  })

  it('formats discrete visibility windows and beat motion steps with deterministic return to rest', () => {
    expect(formatKeyTimes([0, 0.25, 1])).toBe('0.0000;0.2500;1.0000')
    expect(
      visibleWindow([
        [0.24, 0.28],
        [0.84, 0.88],
      ]),
    ).toEqual({
      dur: '16s',
      calcMode: 'discrete',
      values: '0;1;0;1;0',
      keyTimes: '0.0000;0.2400;0.2800;0.8400;0.8800',
    })

    const motion = beatMotion([[0, 0.01, 0.08]], [-1, 0])
    expect(motion.values).toBe('0 0;0 -3;0 0;0 0')
    expect(motion.keyTimes).toBe('0.0000;0.0050;0.0100;1.0000')
  })
})
