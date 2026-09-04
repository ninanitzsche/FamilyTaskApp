import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLongPress } from '../lib/longPress'

describe('createLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('triggers after the delay', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress(onTrigger)
    lp.start(0, 0)
    expect(onTrigger).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('does not trigger when cancelled before the delay', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress(onTrigger)
    lp.start(0, 0)
    lp.cancel()
    vi.advanceTimersByTime(1000)
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('cancels when moving beyond maxMovement', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress(onTrigger, { maxMovement: 8 })
    lp.start(0, 0)
    lp.move(0, 20)
    vi.advanceTimersByTime(1000)
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('allows small movement without cancelling', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress(onTrigger, { maxMovement: 8 })
    lp.start(0, 0)
    lp.move(0, 3)
    vi.advanceTimersByTime(500)
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('supports repeated start/trigger cycles', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress(onTrigger)
    lp.start(0, 0)
    vi.advanceTimersByTime(500)
    lp.start(0, 0)
    vi.advanceTimersByTime(500)
    expect(onTrigger).toHaveBeenCalledTimes(2)
  })
})
