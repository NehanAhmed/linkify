import { useState } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const PRESET_COLORS = [
  "#6366f1",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#06b6d4",
  "#f43f5e",
  "#f59e0b",
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState("")

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "h-7 w-7 rounded-full border-2 transition-all hover:scale-110",
              value === color
                ? "border-foreground scale-110 ring-2 ring-foreground/20"
                : "border-transparent"
            )}
            style={{ backgroundColor: color }}
            aria-label={`Color ${color}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Custom:</span>
        <Input
          type="text"
          value={customHex}
          onChange={(e) => {
            setCustomHex(e.target.value)
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
              onChange(e.target.value)
            }
          }}
          placeholder="#6366f1"
          className="h-7 w-24 font-mono text-xs"
        />
        {value && (
          <div
            className="h-6 w-6 rounded-full border border-border"
            style={{ backgroundColor: value }}
          />
        )}
      </div>
    </div>
  )
}
