import { cn } from "@/lib/utils"
import { useState, useRef, useEffect, type ReactNode } from "react"

interface CommandProps {
  children: ReactNode
  className?: string
  filter?: (value: string, search: string) => boolean
}

export function Command({ children, className, filter }: CommandProps) {
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  return (
    <div className={cn("", className)}>
      {children}
    </div>
  )
}

interface CommandInputProps {
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function CommandInput({ placeholder = "Search...", value, onValueChange, className }: CommandInputProps) {
  return (
    <div className="flex items-center border-b border-border px-3">
      <input
        ref={(el) => el?.focus()}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-md bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground",
          className
        )}
      />
    </div>
  )
}

interface CommandListProps {
  children: ReactNode
  className?: string
}

export function CommandList({ children, className }: CommandListProps) {
  return (
    <div className={cn("max-h-60 overflow-y-auto py-1", className)}>
      {children}
    </div>
  )
}

interface CommandEmptyProps {
  children: ReactNode
  className?: string
}

export function CommandEmpty({ children, className }: CommandEmptyProps) {
  return (
    <div className={cn("py-6 text-center text-sm text-muted-foreground", className)}>
      {children}
    </div>
  )
}

interface CommandItemProps {
  children: ReactNode
  value?: string
  onSelect?: () => void
  disabled?: boolean
  className?: string
}

export function CommandItem({ children, value, onSelect, disabled, className }: CommandItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:bg-muted aria-selected:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
    >
      {children}
    </button>
  )
}

interface CommandGroupProps {
  children: ReactNode
  heading?: string
  className?: string
}

export function CommandGroup({ children, heading, className }: CommandGroupProps) {
  return (
    <div className={cn("", className)}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{heading}</div>
      )}
      {children}
    </div>
  )
}
