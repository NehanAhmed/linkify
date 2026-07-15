import { cn } from "@/lib/utils"
import { forwardRef, useState, type InputHTMLAttributes } from "react"

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked: controlledChecked, defaultChecked, onChange, onCheckedChange, disabled, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = useState(defaultChecked ?? controlledChecked ?? false)
    const isControlled = controlledChecked !== undefined
    const checked = isControlled ? controlledChecked : internalChecked

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalChecked(e.target.checked)
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <label
        className={cn(
          "relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-[3px]"
          )}
        />
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
