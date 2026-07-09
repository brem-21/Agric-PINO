import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium tracking-tight transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[#d3fa99] text-[#1c3a13]",
        secondary:   "bg-[#eeeee9] text-[#1c3a13]",
        destructive: "bg-red-100 text-red-700",
        warning:     "bg-[#eeeee9] text-[#1c3a13]",
        success:     "bg-[#d3fa99] text-[#1c3a13]",
        outline:     "border border-[#1c3a13] text-[#1c3a13] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
