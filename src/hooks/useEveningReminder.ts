import { useEffect, useRef } from 'react'

const FLAG_PREFIX = 'familyboard:reminderShown:'

function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

function todayKey(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function useEveningReminder(enabled: boolean, nothingDoneToday: boolean) {
  const nothingRef = useRef(nothingDoneToday)
  nothingRef.current = nothingDoneToday

  useEffect(() => {
    if (!enabled || !canNotify() || Notification.permission !== 'granted') return
    const key = FLAG_PREFIX + todayKey()
    if (localStorage.getItem(key)) return

    const show = () => {
      if (nothingRef.current) {
        try {
          new Notification('familyboard ✨', {
            body: 'Heute noch nichts erledigt? Schau kurz in deinen Tag!',
          })
        } catch {
          return
        }
      }
      localStorage.setItem(key, '1')
    }

    const now = new Date()
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0)
    if (now >= target) {
      show()
      return
    }
    const timer = setTimeout(show, target.getTime() - now.getTime())
    return () => clearTimeout(timer)
  }, [enabled, nothingDoneToday])
}
