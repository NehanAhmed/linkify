import { cn } from "@/lib/utils"
import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from "react"

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = createContext<PopoverContextValue | undefined>(undefined)

function usePopover() {
  const ctx = useContext(PopoverContext)
  if (!ctx) throw new Error("Popover components must be used within Popover")
  return ctx
}

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

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative">{children}</div>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps {
  children: ReactNode
  asChild?: boolean
}

export function PopoverTrigger({ children }: PopoverTriggerProps) {
  const { open, setOpen } = usePopover()
  return <div onClick={() => setOpen(!open)}>{children}</div>
}

interface PopoverContentProps {
  children: ReactNode
  className?: string
  align?: "start" | "end"
}

export function PopoverContent({ children, className, align = "start" }: PopoverContentProps) {
  const { open } = usePopover()
  if (!open) return null
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
