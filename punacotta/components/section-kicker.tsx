export function SectionKicker({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-7 items-center border-2 border-border bg-primary px-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground">
        {index}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="h-[2px] flex-1 bg-border" aria-hidden="true" />
    </div>
  )
}
