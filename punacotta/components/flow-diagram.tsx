/**
 * A stylized Sankey-style flow of the Tanelu UX:
 * multiple order sources funnel through one unified flow into clean outcomes.
 */
const SOURCES = [
  { label: "Phone", y: 40 },
  { label: "Online", y: 100 },
  { label: "Yandex", y: 160 },
  { label: "Glovo", y: 220 },
]

const OUTPUTS = [
  { label: "Prep plan", y: 55 },
  { label: "Inventory", y: 105 },
  { label: "Roster", y: 155 },
  { label: "Delivery", y: 205 },
]

export function FlowDiagram() {
  const hubX = 250
  const hubTop = 90
  const hubBottom = 170
  const hubMid = (hubTop + hubBottom) / 2

  return (
    <figure className="border-2 border-border bg-card shadow-hard">
      <figcaption className="flex items-center justify-between border-b-2 border-border bg-secondary px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-secondary-foreground">
          Fig. 01 — Sankey of the UX
        </span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Many in / one flow / clean out
        </span>
      </figcaption>

      <div className="p-4 sm:p-6">
        <svg
          viewBox="0 0 500 260"
          className="h-auto w-full"
          role="img"
          aria-label="Sankey diagram showing phone, online, Yandex and Glovo orders funneling through a single Tanelu flow into prep plans, inventory, roster and delivery."
        >
          {/* incoming ribbons */}
          {SOURCES.map((s) => (
            <path
              key={s.label}
              d={`M 90 ${s.y} C 170 ${s.y}, 180 ${hubMid}, ${hubX - 40} ${hubMid}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="10"
              strokeOpacity="0.5"
            />
          ))}

          {/* outgoing ribbons */}
          {OUTPUTS.map((o) => (
            <path
              key={o.label}
              d={`M ${hubX + 40} ${hubMid} C 330 ${hubMid}, 340 ${o.y}, 410 ${o.y}`}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="10"
              strokeOpacity="0.35"
            />
          ))}

          {/* source nodes */}
          {SOURCES.map((s) => (
            <g key={s.label}>
              <rect x="30" y={s.y - 12} width="60" height="24" fill="var(--accent)" stroke="var(--border)" strokeWidth="2" />
              <text x="60" y={s.y + 4} textAnchor="middle" className="fill-[var(--accent-foreground)] font-mono text-[10px] uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                {s.label}
              </text>
            </g>
          ))}

          {/* hub */}
          <rect x={hubX - 40} y={hubTop} width="80" height={hubBottom - hubTop} fill="var(--primary)" stroke="var(--border)" strokeWidth="2" />
          <text x={hubX} y={hubMid - 4} textAnchor="middle" className="fill-[var(--primary-foreground)]" style={{ fontFamily: "var(--font-serif)", fontSize: "15px", fontWeight: 700 }}>
            tanelu
          </text>
          <text x={hubX} y={hubMid + 12} textAnchor="middle" className="fill-[var(--primary-foreground)]" style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.15em" }}>
            ONE FLOW
          </text>

          {/* output nodes */}
          {OUTPUTS.map((o) => (
            <g key={o.label}>
              <rect x="410" y={o.y - 12} width="80" height="24" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
              <text x="450" y={o.y + 4} textAnchor="middle" className="fill-[var(--foreground)]" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", textTransform: "uppercase" }}>
                {o.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </figure>
  )
}
