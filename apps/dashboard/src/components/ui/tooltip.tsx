import { cn } from "@/lib/utils"
import { useState, useRef, useId, type ReactNode } from "react"

interface TooltipProps {
  content: string
  children: ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [show, setShow] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const id = useId()
  const triggerRef = useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => { setShow(true) }, 300)
  }

  const hideTooltip = () => {
    clearTimeout(timeoutRef.current)
    setShow(false)
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      aria-describedby={show ? id : undefined}
    >
      {children}
      {show && (
        <div
          id={id}
          role="tooltip"
          className={cn(
            "absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground shadow-lg whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis",
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
