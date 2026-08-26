import { cn } from "@/lib/utils"

export function TaneluLogo({
  className,
  showMark = true,
}: {
  className?: string
  showMark?: boolean
}) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className="font-serif text-2xl font-semibold lowercase leading-none tracking-tight">
        tanelu
      </span>
      {showMark && (
        <span aria-hidden="true" className="relative inline-flex translate-y-[-1px]">
          {/* small burner mark echoing the original wordmark's pin */}
          <svg
            width="12"
            height="16"
            viewBox="0 0 12 16"
            fill="none"
            className="text-accent"
          >
            <rect x="0.5" y="0.5" width="11" height="4" fill="currentColor" />
            <circle cx="6" cy="10" r="4" fill="currentColor" />
          </svg>
        </span>
      )}
    </span>
  )
}
