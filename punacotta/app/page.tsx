import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { OnboardingSection } from "@/components/onboarding-section"
import { OverheadSection } from "@/components/overhead-section"
import { DataSection } from "@/components/data-section"
import { SingleSourceSection } from "@/components/single-source-section"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <OnboardingSection />
        <OverheadSection />
        <DataSection />
        <SingleSourceSection />
        <SiteFooter />
      </main>
    </div>
  )
}
