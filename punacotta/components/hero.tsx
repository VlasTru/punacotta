import Image from "next/image"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b-2 border-border">
      <div className="absolute inset-0 grid-lines opacity-60" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-0 px-4 sm:px-6 lg:grid-cols-2">
        {/* Left: copy */}
        <div className="flex flex-col justify-center border-border py-14 lg:border-r-2 lg:py-24 lg:pr-12">
          <div className="mb-6 inline-flex w-fit items-center gap-2 border-2 border-border bg-accent px-3 py-1.5">
            <span className="font-mono text-[11px] uppercase tracking-widest text-accent-foreground">
              This is a hero image — but Tanelu is not for heroism
            </span>
          </div>

          <h1 className="font-serif text-5xl font-bold leading-[0.98] tracking-tight text-pretty text-primary sm:text-6xl">
            Business First.
            <br />
            Ultimately,
            <br />
            <span className="text-accent">What&apos;s Next?</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Tomorrow you open your doors to new customers — and only when the day
            is done do you open sales reports and forecasts. Not the other way
            round. Tanelu prioritizes business processes over specific features.
          </p>

          <p className="mt-4 max-w-md text-base leading-relaxed text-foreground">
            What we have is a freeway from procurement to delivery. But there are
            side roads too — you&apos;re free to be forgetful and sporadic.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              nativeButton={false}
              render={<a href="#cta" />}
              className="h-12 rounded-none border-2 border-border bg-primary px-6 font-mono text-xs uppercase tracking-widest text-primary-foreground shadow-hard-sm transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Open the doors
            </Button>
            <Button
              nativeButton={false}
              render={<a href="#onboarding" />}
              variant="outline"
              className="h-12 rounded-none border-2 border-border bg-transparent px-6 font-mono text-xs uppercase tracking-widest text-primary hover:bg-secondary"
            >
              See how it works
            </Button>
          </div>
        </div>

        {/* Right: image */}
        <div className="relative min-h-[320px] border-t-2 border-border lg:min-h-full lg:border-t-0">
          <Image
            src="/hero-kitchen.png"
            alt="A small dark-kitchen prep station with a mounted order screen and organized mise-en-place"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div
            className="pointer-events-none absolute inset-0 mix-blend-multiply"
            style={{ background: "color-mix(in oklch, var(--primary) 22%, transparent)" }}
            aria-hidden="true"
          />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t-2 border-border bg-background/90 px-4 py-2 backdrop-blur">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Procurement → Delivery
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
              One freeway
            </span>
          </div>
        </div>
      </div>

      {/* Ticker strip */}
      <div className="relative border-t-2 border-border bg-primary">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-1 px-4 py-3 sm:px-6">
          {[
            "No implementation engineers",
            "No training workshops",
            "No deadlock screens",
            "No ERP",
          ].map((item) => (
            <span
              key={item}
              className="font-mono text-[11px] uppercase tracking-widest text-primary-foreground/80"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
