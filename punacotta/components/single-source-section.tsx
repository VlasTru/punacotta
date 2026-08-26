import Image from "next/image"
import { SectionKicker } from "@/components/section-kicker"

const PATCHWORK = ["POS app", "Kitchen screen", "Waiter app", "Supplier connectors"]

export function SingleSourceSection() {
  return (
    <section id="single-source" className="border-b-2 border-border bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionKicker index="04" label="Single source of truth" />

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-serif text-4xl font-bold leading-tight tracking-tight text-pretty text-primary sm:text-5xl">
              One screen. Because it&apos;s just natural.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Customers would rather order pizza and drinks in one place and pay
              once, without switching between apps. First impressions matter —
              and so does the second, third and hundredth order.
            </p>
            <p className="mt-4 text-base leading-relaxed text-foreground">
              The same idea drives Tanelu. A kitchen receives orders from many
              sources: by phone, online, from Yandex or Glovo. An
              &ldquo;all-in-one leading industry solution&rdquo; usually means a
              POS app, a kitchen screen, a third-party waiter app and licensed
              supplier connectors — a patchwork of tools with wildly
              inconsistent interfaces.
            </p>
            <p className="mt-4 text-base leading-relaxed text-foreground">
              That&apos;s where Tanelu perfects the unified interface. You want
              one arrivals-and-departures screen, because it&apos;s just natural.
              With everything on a single screen, your team spends less time
              switching tabs, learning interfaces, or waiting for someone to
              troubleshoot yet another integration.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Patchwork vs unified */}
            <div className="border-2 border-border bg-card p-5 shadow-hard-sm">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                The old patchwork
              </p>
              <div className="flex flex-wrap gap-2">
                {PATCHWORK.map((item) => (
                  <span
                    key={item}
                    className="border-2 border-dashed border-muted-foreground/50 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground line-through"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3 border-t-2 border-border pt-5">
                <span className="border-2 border-border bg-primary px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-primary-foreground">
                  Tanelu
                </span>
                <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
                  One unified interface
                </span>
              </div>
            </div>

            <div className="relative min-h-[260px] border-2 border-border shadow-hard">
              <Image
                src="/prep-station.png"
                alt="A single mounted kitchen screen showing a unified order queue"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0 mix-blend-multiply"
                style={{ background: "color-mix(in oklch, var(--primary) 18%, transparent)" }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
