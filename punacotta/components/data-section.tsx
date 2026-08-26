import { SectionKicker } from "@/components/section-kicker"

const PRODUCTS = [
  "Purchasing recommendations",
  "Automated prep plans",
  "Capacity management",
  "Staff management",
  "Recipe enforcement",
  "Unified order flow",
]

export function DataSection() {
  return (
    <section id="data" className="border-b-2 border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionKicker index="03" label="Data" />

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="font-serif text-4xl font-bold leading-tight tracking-tight text-pretty text-primary sm:text-5xl">
              Data is our passion.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Data became the new oil decades ago — and since 2006 that&apos;s
              been a trite expression. Trouble is, this oil runs deep inside
              on-premise solutions and expires before use.
            </p>
            <p className="mt-4 text-base leading-relaxed text-foreground">
              Tanelu collects data to remove the deadlocks where users get
              frustrated — long before the service desk is overwhelmed by the
              same question, before a product owner returns from parental leave,
              before the team schedules a fix for next quarter.
            </p>

            <blockquote className="mt-8 border-l-4 border-accent bg-secondary p-5">
              <p className="font-serif text-lg leading-snug text-primary text-pretty">
                &ldquo;Are you reading this while building a roster and waiting for
                staff to send availability in a WhatsApp chat?&rdquo;
              </p>
            </blockquote>
          </div>

          <div className="lg:col-span-7">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Commercial data is the product itself — and that includes:
            </p>
            <ul className="grid grid-cols-1 gap-px border-2 border-border bg-border sm:grid-cols-2">
              {PRODUCTS.map((item, i) => (
                <li
                  key={item}
                  className="group flex items-center gap-4 bg-card p-5 transition-colors hover:bg-accent"
                >
                  <span className="font-mono text-sm font-bold text-accent group-hover:text-accent-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-lg font-semibold text-primary group-hover:text-accent-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
