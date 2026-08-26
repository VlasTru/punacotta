import Link from "next/link"
import { TaneluLogo } from "@/components/tanelu-logo"
import { Button } from "@/components/ui/button"

const NAV = [
  { label: "Onboarding", href: "#onboarding" },
  { label: "Overhead", href: "#overhead" },
  { label: "Data", href: "#data" },
  { label: "One Screen", href: "#single-source" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center text-primary" aria-label="Tanelu home">
          <TaneluLogo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#"
            className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary sm:inline"
          >
            Sign in
          </a>
          <Button
            nativeButton={false}
            render={<a href="#cta" />}
            className="h-10 rounded-none border-2 border-border bg-primary px-5 font-mono text-xs uppercase tracking-widest text-primary-foreground shadow-hard-sm transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            Start free
          </Button>
        </div>
      </div>
    </header>
  )
}
