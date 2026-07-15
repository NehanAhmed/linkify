import { cn } from "@/lib/utils"
import { type VariantProps, cva } from "class-variance-authority"
import { forwardRef, type ButtonHTMLAttributes } from "react"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-accent active:translate-y-[1px]",
        outline: "border border-border bg-background text-foreground hover:bg-muted active:translate-y-[1px]",
        ghost: "text-foreground hover:bg-muted active:translate-y-[1px]",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90 active:translate-y-[1px]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
