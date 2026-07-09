import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-4 py-2 text-sm text-[#1c3a13] tracking-tight placeholder:text-[#1c3a13]/40 focus:outline-none focus:ring-2 focus:ring-[#1c3a13] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
