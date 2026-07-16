import { cn } from "@/lib/utils"
import { forwardRef, type InputHTMLAttributes } from "react"

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onChange, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-border transition-colors",
          checked ? "bg-primary border-primary" : "bg-background",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            onChange?.(e)
            onCheckedChange?.(e.target.checked)
          }}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        {checked && (
          <svg
            className="h-3 w-3 text-primary-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
