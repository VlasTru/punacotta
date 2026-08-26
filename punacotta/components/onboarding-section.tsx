import { SectionKicker } from "@/components/section-kicker"
import { FlowDiagram } from "@/components/flow-diagram"

export function OnboardingSection() {
  return (
    <section id="onboarding" className="border-b-2 border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionKicker index="01" label="Onboarding" />

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-serif text-4xl font-bold leading-tight tracking-tight text-pretty text-primary sm:text-5xl">
              What else could it be, other than simple?
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Tanelu was built in response to restaurant management solutions
              that demand implementation engineers, heaps of outdated
              documentation, scheduled visits and training workshops.
              Fast-forward a few weeks and you&apos;re filing a ticket with
              customer support. Fast-forward again and there&apos;s no one left
              to onboard new team members.
            </p>
            <p className="mt-4 text-base leading-relaxed text-foreground">
              Business interruptions? Say that again. You have no time, and we
              genuinely value that. We don&apos;t allocate teams to rescue people
              lost in navigation or documentation — but we do want to hear back
              from you.
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-px border-2 border-border bg-border">
              {[
                ["0", "Implementation engineers"],
                ["0", "Training workshops scheduled"],
                ["~1", "Afternoon to get going"],
                ["1", "Screen to learn"],
              ].map(([stat, label]) => (
                <div key={label} className="bg-card p-4">
                  <dt className="font-serif text-3xl font-bold text-primary">{stat}</dt>
                  <dd className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex items-center">
            <FlowDiagram />
          </div>
        </div>
      </div>
    </section>
  )
}
