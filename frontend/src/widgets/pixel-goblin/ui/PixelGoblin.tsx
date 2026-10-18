import React, { useEffect, useId, useMemo, useRef } from 'react'
import { Box, useMediaQuery } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useColorMode } from '@/features/theme-switch'
import {
  GOBLIN_GROUND_OFFSET_PERCENT,
  buildGoblinScene,
  type GoblinMotion,
  type GoblinScene,
  type PixelRect,
  type PortalSpec,
  type TimelineSpec,
} from '../model/goblinScene'

const renderRects = (rects: readonly PixelRect[]) =>
  rects.map((rect, index) => (
    <rect key={index} x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={rect.fill} />
  ))

const renderAnimate = (attributeName: string, spec: TimelineSpec) => (
  <animate
    attributeName={attributeName}
    dur={spec.dur}
    begin={spec.begin}
    repeatCount="indefinite"
    calcMode={spec.calcMode}
    keySplines={spec.keySplines}
    values={spec.values}
    keyTimes={spec.keyTimes}
  />
)

const renderAnimateTransform = (type: 'translate' | 'scale', spec: TimelineSpec) => (
  <animateTransform
    attributeName="transform"
    type={type}
    dur={spec.dur}
    begin={spec.begin}
    repeatCount="indefinite"
    calcMode={spec.calcMode}
    keySplines={spec.keySplines}
    values={spec.values}
    keyTimes={spec.keyTimes}
  />
)

const renderPortalRing = (
  layer: 'outer' | 'rim' | 'core',
  portal: PortalSpec,
  scale: TimelineSpec,
  children: React.ReactNode,
) => (
  <g data-portal-layer={layer} transform={`translate(${portal.pivotX} ${portal.pivotY})`}>
    <g>
      {renderAnimateTransform('scale', scale)}
      <g transform={`translate(${-portal.pivotX} ${-portal.pivotY})`}>{children}</g>
    </g>
  </g>
)

const renderPortal = (portal: PortalSpec) => (
  <g data-portal={portal.side} transform={`translate(${portal.x} ${portal.y})`} opacity={0}>
    {renderAnimate('opacity', portal.opacity)}
    {renderPortalRing(
      'outer',
      portal,
      portal.scale,
      <>
        {renderRects(portal.rects)}
        {portal.particles.map((particle, index) => (
          <g key={index} data-portal-particle={portal.side}>
            {renderAnimateTransform('translate', particle.motion)}
            <rect
              x={particle.rect.x}
              y={particle.rect.y}
              width={particle.rect.width}
              height={particle.rect.height}
              fill={particle.rect.fill}
            >
              {renderAnimate('opacity', particle.opacity)}
            </rect>
          </g>
        ))}
      </>,
    )}
    {renderPortalRing('rim', portal, portal.rimScale, renderRects(portal.rimRects))}
    {renderPortalRing(
      'core',
      portal,
      portal.coreScale,
      <g>
        {renderRects(portal.coreRects)}
        {renderAnimate('opacity', portal.corePulse)}
      </g>,
    )}
  </g>
)

const renderLaptopLayer = (scene: GoblinScene, visibility: TimelineSpec) => {
  const { laptop } = scene
  return (
    <g opacity={0}>
      <g>
        {renderAnimateTransform('translate', laptop.motion)}
        {renderRects(laptop.deck)}
        <g>
          {renderRects(laptop.closedLid)}
          {renderAnimate('opacity', laptop.closedLidVisible)}
        </g>
        <g transform={`translate(${laptop.pivotX} ${laptop.pivotY})`}>
          <g>
            {renderAnimateTransform('scale', laptop.lidSwing)}
            <g transform={`translate(${-laptop.pivotX} ${-laptop.pivotY})`}>{renderRects(laptop.openLid)}</g>
          </g>
        </g>
        <g>
          {renderRects(laptop.holdingHand)}
          {renderAnimate('opacity', laptop.holdingVisible)}
        </g>
      </g>
      {renderAnimate('opacity', visibility)}
    </g>
  )
}

const SCENE_RENDERERS: Record<GoblinMotion, (scene: GoblinScene, clipId: string) => React.ReactElement> = {
  animated: (scene, clipId) => (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={scene.portals.clipX} y={0} width={scene.portals.clipWidth} height={scene.height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <g data-motion="animated" transform={`translate(${scene.startX} ${scene.topY})`}>
          {renderAnimateTransform('translate', scene.travel)}
          <ellipse
            cx={scene.shadow.initialCx}
            cy={scene.shadow.cy}
            rx={scene.shadow.initialRx}
            ry={scene.shadow.ry}
            fill="#000"
            opacity={scene.palette.shadowOpacity}
          >
            {renderAnimate('rx', scene.shadow.rx)}
            {renderAnimate('cx', scene.shadow.cx)}
          </ellipse>
          {renderLaptopLayer(scene, scene.laptop.behindVisible)}
          <g>
            {renderAnimateTransform('translate', scene.body.lean)}
            <g>
              {renderRects(scene.body.rects)}
              <g>
                {renderRects(scene.body.closedEyes)}
                {renderAnimate('opacity', scene.body.closedEyesVisible)}
              </g>
              <g opacity={0}>
                {renderRects(scene.body.openedEyes)}
                {renderAnimateTransform('translate', scene.body.eyeGlance)}
                {renderAnimate('opacity', scene.body.openedEyesVisible)}
              </g>
              {renderAnimateTransform('translate', scene.body.bounce)}
            </g>
          </g>
          <g>
            {renderRects(scene.legs.left)}
            {renderAnimateTransform('translate', scene.legs.leftStep)}
          </g>
          <g>
            {renderRects(scene.legs.right)}
            {renderAnimateTransform('translate', scene.legs.rightStep)}
          </g>
          {renderLaptopLayer(scene, scene.laptop.inFrontVisible)}
          <g opacity={0}>
            {scene.typingHands.hands.map((hand, index) => (
              <g key={index}>
                {renderRects(hand.rects)}
                {renderAnimateTransform('translate', hand.tap)}
              </g>
            ))}
            {renderAnimate('opacity', scene.typingHands.visible)}
          </g>
          <g opacity={0}>
            {scene.glyphs.items.map((glyph) => (
              <text
                key={glyph.text}
                x={glyph.x}
                y={glyph.y}
                fontFamily="ui-monospace, Menlo, Consolas, monospace"
                fontSize={9}
                fill={scene.palette.glyph}
                opacity={0}
              >
                {glyph.text}
                <animate
                  attributeName="opacity"
                  values={glyph.opacityValues}
                  dur={glyph.dur}
                  begin={glyph.begin}
                  repeatCount="indefinite"
                />
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={glyph.translateValues}
                  dur={glyph.dur}
                  begin={glyph.begin}
                  repeatCount="indefinite"
                />
              </text>
            ))}
            {renderAnimate('opacity', scene.glyphs.visible)}
          </g>
        </g>
      </g>
      {renderPortal(scene.portals.entry)}
      {renderPortal(scene.portals.exit)}
    </>
  ),
  resting: (scene) => (
    <g data-motion="resting" transform={`translate(${scene.stopX} ${scene.topY})`}>
      <ellipse
        cx={scene.shadow.restingCx}
        cy={scene.shadow.cy}
        rx={scene.shadow.restingRx}
        ry={scene.shadow.ry}
        fill="#000"
        opacity={scene.palette.shadowOpacity}
      />
      <g>
        {renderRects(scene.body.rects)}
        {renderRects(scene.body.closedEyes)}
      </g>
      <g>{renderRects(scene.legs.left)}</g>
      <g>{renderRects(scene.legs.right)}</g>
      <g>
        {renderRects(scene.laptop.deck)}
        {renderRects(scene.laptop.openLid)}
      </g>
      <g>
        {scene.typingHands.hands.map((hand, index) => (
          <g key={index}>{renderRects(hand.rects)}</g>
        ))}
      </g>
      <g>
        {scene.glyphs.items.map((glyph) => (
          <text
            key={glyph.text}
            x={glyph.x}
            y={glyph.restingY}
            fontFamily="ui-monospace, Menlo, Consolas, monospace"
            fontSize={9}
            fill={scene.palette.glyph}
          >
            {glyph.text}
          </text>
        ))}
      </g>
    </g>
  ),
}

const setSvgAnimationRunning = (svg: SVGSVGElement, running: boolean) => {
  if (typeof svg.pauseAnimations !== 'function' || typeof svg.unpauseAnimations !== 'function') return
  if (running) {
    svg.unpauseAnimations()
  } else {
    svg.pauseAnimations()
  }
}

const PixelGoblin: React.FC = () => {
  const { t } = useTranslation()
  const { mode, animationsPaused } = useColorMode()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const svgRef = useRef<SVGSVGElement | null>(null)
  const rawId = useId()
  const clipId = `goblin-portal-clip-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const motion: GoblinMotion = animationsPaused || reducedMotion ? 'resting' : 'animated'
  const scene = useMemo(() => buildGoblinScene(mode), [mode])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || motion !== 'animated') return

    let inViewport = true
    const syncPlayback = () => {
      setSvgAnimationRunning(svg, inViewport && document.visibilityState !== 'hidden')
    }

    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            ([entry]) => {
              inViewport = entry ? entry.isIntersecting : true
              syncPlayback()
            },
            { threshold: 0 },
          )
        : null

    observer?.observe(svg)
    document.addEventListener('visibilitychange', syncPlayback)
    syncPlayback()

    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', syncPlayback)
    }
  }, [motion])

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        // Match the 32px corner radius of the panel below so the portals and goblin sit on its flat roof.
        px: 4,
        zIndex: 2,
        pointerEvents: 'none',
        userSelect: 'none',
        // Isolate SVG repaints from the panel below so backdrop-filter and box-shadow are never re-rasterized.
        contain: 'layout style paint',
      }}
    >
      <Box
        ref={svgRef}
        component="svg"
        xmlns="http://www.w3.org/2000/svg"
        width={scene.width}
        height={scene.height}
        viewBox={`0 0 ${scene.width} ${scene.height}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={t('home.goblinLabel')}
        sx={{
          display: 'block',
          width: '100%',
          maxWidth: scene.width,
          height: 'auto',
          mx: 'auto',
          // Row 18 of 20 is the ground plane; shifting down by 10% lands the feet, laptop and portals on the border.
          transform: `translateY(${GOBLIN_GROUND_OFFSET_PERCENT}%) translateZ(0)`,
          willChange: motion === 'animated' ? 'transform' : 'auto',
        }}
      >
        {SCENE_RENDERERS[motion](scene, clipId)}
      </Box>
    </Box>
  )
}

export default PixelGoblin
