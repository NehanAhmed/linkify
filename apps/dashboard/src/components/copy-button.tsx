import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  text: string
  className?: string
  variant?: "primary" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

export default function CopyButton({ text, className, variant = "outline", size = "icon" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const input = document.createElement("input")
      input.value = text
      input.style.position = "fixed"
      input.style.opacity = "0"
      document.body.appendChild(input)
      try {
        input.select()
        if (document.execCommand("copy")) {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }
      } finally {
        document.body.removeChild(input)
      }
    }
  }, [text])

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("gap-1.5", className)}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}
