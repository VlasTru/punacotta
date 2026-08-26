import { TaneluLogo } from "@/components/tanelu-logo"
import { Button } from "@/components/ui/button"

export function SiteFooter() {
  return (
    <>
      <section id="cta" className="border-b-2 border-border bg-accent text-accent-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div>
            <h2 className="max-w-2xl font-serif text-4xl font-bold leading-tight tracking-tight text-pretty sm:text-5xl">
              A digital operations manager. Not another ERP.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-accent-foreground/80">
              Start tomorrow morning. Open the doors first — the reports can wait
              until the day is done.
            </p>
          </div>
          <Button
            nativeButton={false}
            render={<a href="#" />}
            className="h-14 shrink-0 rounded-none border-2 border-border bg-primary px-8 font-mono text-sm uppercase tracking-widest text-primary-foreground shadow-hard transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
          >
            Start free — no engineers
          </Button>
        </div>
      </section>

      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs">
              <div className="text-primary-foreground">
                <TaneluLogo />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">
                Operations software for small restaurants and dark kitchens.
                Business processes first — from procurement to delivery.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              {[
                { h: "Product", items: ["Onboarding", "Overhead", "Data", "One screen"] },
                { h: "Company", items: ["About", "Manifesto", "Contact"] },
                { h: "Legal", items: ["Privacy", "Terms"] },
              ].map((col) => (
                <div key={col.h}>
                  <h3 className="font-mono text-[11px] uppercase tracking-widest text-primary-foreground/60">
                    {col.h}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {col.items.map((item) => (
                      <li key={item}>
                        <a
                          href="#"
                          className="text-sm text-primary-foreground/80 transition-colors hover:text-accent"
                        >
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t-2 border-primary-foreground/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[11px] uppercase tracking-widest text-primary-foreground/60">
              © {new Date().getFullYear()} Tanelu
            </p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-primary-foreground/60">
              Built for Noah &amp; Zoey, and businesses of any size
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
