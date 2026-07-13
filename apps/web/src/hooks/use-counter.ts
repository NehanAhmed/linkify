import { useEffect, useState } from "react"

export function useCounter(end: number, duration = 2000, startOn = true) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!startOn) return

    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))

      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [end, duration, startOn])

  return count
}
