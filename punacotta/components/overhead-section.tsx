import { SectionKicker } from "@/components/section-kicker"

const REMOVES = [
  {
    title: "Matches how ingredients are actually used",
    body: "Not how a textbook says they should be. Tanelu maps to your real prep, not an idealized supply chain.",
  },
  {
    title: "Guides you through inventory tracking",
    body: "Rather than mandating software architecture. You count what matters, when it matters.",
  },
  {
    title: "Keeps food cost steady",
    body: "No more swinging like a caffeinated pendulum. Predictable numbers, fewer surprises.",
  },
]

export function OverheadSection() {
  return (
    <section id="overhead" className="border-b-2 border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 items-center border-2 border-primary-foreground bg-primary-foreground px-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary">
            02
          </span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-primary-foreground/70">
            Minimum overhead
          </span>
          <span className="h-[2px] flex-1 bg-primary-foreground/30" aria-hidden="true" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-serif text-4xl font-bold leading-tight tracking-tight text-pretty sm:text-5xl">
              Minimum overhead. No, really.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-primary-foreground/80">
              You don&apos;t wake up wanting dashboards. What you want is less
              micromanagement. Tanelu doesn&apos;t pretend to be an all-in-one
              solution for hotels, chain stores and space platforms.
            </p>
            <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
              It was built for Noah at the pastry shop downstairs, and for Zoey
              making the best long-fermented cheeses in the neighborhood. They
              dream big — but that doesn&apos;t mean they dream of an ERP. They
              want a digital operations manager that respects their attention
              span. We think that holds true for a business of any size.
            </p>
          </div>

          <div>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-primary-foreground/60">
              Tanelu removes unnecessary overhead by:
            </p>
            <ul className="space-y-px border-2 border-primary-foreground/30">
              {REMOVES.map((item, i) => (
                <li
                  key={item.title}
                  className="flex gap-4 border-b-2 border-primary-foreground/20 bg-primary-foreground/5 p-5 last:border-b-0"
                >
                  <span className="font-mono text-sm font-bold text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-semibold leading-snug">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-primary-foreground/70">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
