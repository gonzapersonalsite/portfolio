import { describe, expect, it } from 'vitest'
import { fitSize } from './fitSize'

describe('fitSize', () => {
  it('scales a portrait image down to the box height', () => {
    expect(fitSize({ width: 1350, height: 2400 }, { width: 1200, height: 600 })).toEqual({ width: 337.5, height: 600 })
  })

  it('scales a landscape image down to the box width', () => {
    expect(fitSize({ width: 1920, height: 1080 }, { width: 960, height: 900 })).toEqual({ width: 960, height: 540 })
  })

  it('never enlarges an image smaller than the box', () => {
    expect(fitSize({ width: 512, height: 512 }, { width: 1200, height: 800 })).toEqual({ width: 512, height: 512 })
  })
})
