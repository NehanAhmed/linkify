import { cn } from "@/lib/utils"
import { useState, useRef, useEffect, type ReactNode } from "react"

interface PopoverProps {
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Popover({ children, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, setOpen])

  return <div ref={ref} className="relative">{children}</div>
}

interface PopoverTriggerProps {
  children: ReactNode
  asChild?: boolean
  onClick?: () => void
}

export function PopoverTrigger({ children, onClick }: PopoverTriggerProps) {
  return <div onClick={onClick}>{children}</div>
}

interface PopoverContentProps {
  children: ReactNode
  className?: string
  align?: "start" | "end"
}

export function PopoverContent({ children, className, align = "start" }: PopoverContentProps) {
  return (
    <div
      className={cn(
        "absolute z-50 mt-1 min-w-[14rem] rounded-xl border border-border bg-card p-1 shadow-lg animate-in fade-in zoom-in-95",
        align === "end" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  )
}
