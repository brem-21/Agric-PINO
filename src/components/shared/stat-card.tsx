import * as React from "react"
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface Trend {
  value: number
  direction: "up" | "down"
}

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: Trend
  className?: string
  /** Optional description shown below the value */
  description?: string
  /** Optional accent colour override for the icon background. Defaults to green. */
  iconColor?: "green" | "blue" | "amber" | "red" | "purple"
}

const ICON_STYLES: Record<NonNullable<StatCardProps["iconColor"]>, string> = {
  green: "bg-[#d3fa99] text-[#1c3a13]",
  blue: "bg-[#eeeee9] text-[#1c3a13]",
  amber: "bg-[#eeeee9] text-[#1c3a13]",
  red: "bg-red-100 text-red-700",
  purple: "bg-[#eeeee9] text-[#1c3a13]",
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  className,
  description,
  iconColor = "green",
}: StatCardProps) {
  const isPositiveTrend = trend?.direction === "up"
  const trendValue = trend ? Math.abs(trend.value) : 0

  return (
    <Card className={cn("overflow-hidden bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Icon */}
          <div
            className={cn(
              "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl",
              ICON_STYLES[iconColor]
            )}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>

          {/* Trend badge */}
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                isPositiveTrend
                  ? "bg-[#d3fa99] text-[#1c3a13]"
                  : "bg-red-50 text-red-600"
              )}
              aria-label={`${isPositiveTrend ? "Up" : "Down"} ${trendValue}%`}
            >
              {isPositiveTrend ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>{trendValue}%</span>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1">
          {/* Value */}
          <p className="text-2xl font-bold text-[#1c3a13] leading-tight">
            {typeof value === "number" ? value.toLocaleString("en-GH") : value}
          </p>

          {/* Label */}
          <p className="text-sm font-medium text-[#1c3a13]/50">{label}</p>

          {/* Optional description */}
          {description && (
            <p className="text-xs text-[#1c3a13]/40 pt-0.5">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
