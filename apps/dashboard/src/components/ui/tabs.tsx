import { cn } from "@/lib/utils"
import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("Tabs components must be used within Tabs")
  return ctx
}

interface TabsProps {
  defaultValue: string
  children: ReactNode
  className?: string
  value?: string
  onValueChange?: (value: string) => void
}

export function Tabs({ defaultValue, children, className, value: controlledValue, onValueChange }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = controlledValue ?? internalValue
  const setValue = onValueChange ?? setInternalValue

  return (
    <TabsContext.Provider value={{ value, onValueChange: setValue }}>
      <div className={cn("", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    if (!buttons || buttons.length === 0) return
    const currentIndex = Array.from(buttons).findIndex((btn) => btn === document.activeElement)
    if (currentIndex === -1) return

    let nextIndex: number | undefined
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % buttons.length
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length
    }
    if (nextIndex !== undefined) {
      e.preventDefault()
      buttons[nextIndex].focus()
      buttons[nextIndex].click()
    }
  }, [])

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn("inline-flex items-center gap-1 rounded-lg bg-muted p-1", className)}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabs()
  const isActive = selectedValue === value
  const panelId = `tabpanel-${value.replace(/\s+/g, "-")}`
  const tabId = `tab-${value.replace(/\s+/g, "-")}`

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: selectedValue } = useTabs()
  const panelId = `tabpanel-${value.replace(/\s+/g, "-")}`
  const tabId = `tab-${value.replace(/\s+/g, "-")}`

  if (selectedValue !== value) return null

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      className={cn("", className)}
    >
      {children}
    </div>
  )
}
