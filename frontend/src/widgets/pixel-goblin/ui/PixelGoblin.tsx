import React, { useEffect, useId, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useColorMode } from '@/features/theme-switch'
import { usePrefersReducedMotion } from '@/shared/lib'
import {
  GOBLIN_GROUND_OFFSET_PERCENT,
  buildGoblinScene,
  type GoblinMotion,
  type GoblinScene,
  type GoblinVariant,
  type PixelRect,
  type PortalSpec,
  type TimelineSpec,
} from '../model/goblinScene'
import './PixelGoblin.css'

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
        {portal.ripples.map((ripple, index) => (
          <rect
            key={`ripple-${index}`}
            data-portal-ripple={portal.side}
            x={ripple.rect.x}
            y={ripple.rect.y}
            width={ripple.rect.width}
            height={ripple.rect.height}
            fill={ripple.rect.fill}
          >
            {renderAnimate('opacity', ripple.opacity)}
            {renderAnimate('fill', ripple.fill)}
          </rect>
        ))}
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
          {scene.glyphs.alert ? (
            <g data-goblin-alert="true" opacity={0}>
              {renderAnimate('opacity', scene.glyphs.alert.visible)}
              <g>
                {renderAnimateTransform('translate', scene.glyphs.alert.bounce)}
                <text
                  x={scene.glyphs.alert.x}
                  y={scene.glyphs.alert.y}
                  fontFamily="ui-monospace, Menlo, Consolas, monospace"
                  fontSize={11}
                  fontWeight={800}
                  fill={scene.palette.portalRim}
                >
                  {scene.glyphs.alert.text}
                </text>
              </g>
            </g>
          ) : null}
        </g>
      </g>
      {renderPortal(scene.portals.entry)}
      {renderPortal(scene.portals.exit)}
      {scene.portals.beckon ? (
        <g clipPath={`url(#${clipId})`}>
          <g
            data-portal-beckon="exit"
            transform={`translate(${scene.portals.beckon.x} ${scene.portals.beckon.y})`}
            opacity={0}
          >
            {renderAnimate('opacity', scene.portals.beckon.visible)}
            <g>
              {renderAnimateTransform('translate', scene.portals.beckon.reach)}
              {renderRects(scene.portals.beckon.armRects)}
              <g>
                {renderAnimateTransform('translate', scene.portals.beckon.fingerWave)}
                {renderRects(scene.portals.beckon.fingerRects)}
              </g>
            </g>
          </g>
        </g>
      ) : null}
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

export interface PixelGoblinProps {
  readonly variant?: GoblinVariant
}

const GROUND_OFFSET_STYLE: React.CSSProperties & { '--goblin-ground-offset': string } = {
  '--goblin-ground-offset': `${GOBLIN_GROUND_OFFSET_PERCENT}%`,
}

const PixelGoblin: React.FC<PixelGoblinProps> = ({ variant = 'coding' }) => {
  const { t } = useTranslation()
  const { mode, animationsPaused } = useColorMode()
  const reducedMotion = usePrefersReducedMotion()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const rawId = useId()
  const clipId = `goblin-portal-clip-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const motion: GoblinMotion = animationsPaused || reducedMotion ? 'resting' : 'animated'
  const scene = useMemo(() => buildGoblinScene(mode, undefined, variant), [mode, variant])
  const labels: Record<GoblinVariant, string> = {
    coding: t('home.goblinLabel'),
    lost: t('notFound.goblinLabel'),
  }

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
    <div className="pixel-goblin">
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        width={scene.width}
        height={scene.height}
        viewBox={`0 0 ${scene.width} ${scene.height}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={labels[variant]}
        className={motion === 'animated' ? 'pixel-goblin__svg is-animated' : 'pixel-goblin__svg'}
        style={GROUND_OFFSET_STYLE}
      >
        {SCENE_RENDERERS[motion](scene, clipId)}
      </svg>
    </div>
  )
}

export default PixelGoblin
