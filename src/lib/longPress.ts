export interface LongPress {
  start: (x: number, y: number) => void
  move: (x: number, y: number) => void
  cancel: () => void
}

export function createLongPress(
  onTrigger: () => void,
  options: { delay?: number; maxMovement?: number } = {}
): LongPress {
  const { delay = 500, maxMovement = 8 } = options
  let timer: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0
  let active = false
  let triggered = false

  const clear = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    active = false
    triggered = false
  }

  return {
    start(x, y) {
      clear()
      active = true
      startX = x
      startY = y
      timer = setTimeout(() => {
        if (active) {
          triggered = true
          onTrigger()
        }
      }, delay)
    },
    move(x, y) {
      if (!active || triggered) return
      const dx = x - startX
      const dy = y - startY
      if (Math.hypot(dx, dy) > maxMovement) clear()
    },
    cancel() {
      clear()
    },
  }
}
