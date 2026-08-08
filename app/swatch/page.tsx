import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  formatRupees,
  formatCompactRupees,
  formatDelta,
  formatNumber,
  formatPercent,
  formatPercentDelta,
  formatMonths,
} from "@/lib/format";

/**
 * Throwaway design-system proof page — the Phase 0 gate.
 * Not linked from anywhere the player will go. Delete before the demo.
 */

const TOKENS = [
  { name: "--ink", hex: "#F4F3ED", role: "page background" },
  { name: "--surface", hex: "#FCFBF7", role: "raised panels" },
  { name: "--surface2", hex: "#E9E7DC", role: "hover, inset rows" },
  { name: "--line", hex: "#D3D0C2", role: "hairlines, always 1px" },
  { name: "--chalk", hex: "#14251C", role: "primary text" },
  { name: "--muted", hex: "#566B60", role: "secondary text" },
  { name: "--marigold", hex: "#A85400", role: "YOU" },
  { name: "--mint", hex: "#1E6B47", role: "OPTIMAL" },
  { name: "--rust", hex: "#B3261E", role: "DEBT" },
  { name: "--violet", hex: "#6B4FBF", role: "the coach" },
];

const FORMATS: { call: string; out: string; gate?: boolean }[] = [
  { call: "formatRupees(125000)", out: formatRupees(125000), gate: true },
  { call: "formatRupees(-4200)", out: formatRupees(-4200), gate: true },
  { call: "formatRupees(0)", out: formatRupees(0) },
  { call: "formatCompactRupees(215000)", out: formatCompactRupees(215000) },
  { call: "formatCompactRupees(24000000)", out: formatCompactRupees(24000000) },
  { call: "formatDelta(4200)", out: formatDelta(4200) },
  {
    call: "formatDelta(-215000, {compact})",
    out: formatDelta(-215000, { compact: true }),
  },
  { call: "formatNumber(720)", out: formatNumber(720) },
  { call: "formatPercent(0.42)", out: formatPercent(0.42) },
  { call: "formatPercentDelta(-0.14)", out: formatPercentDelta(-0.14) },
  { call: "formatMonths(0.4)", out: formatMonths(0.4) },
  { call: "formatMonths(3.7)", out: formatMonths(3.7) },
];

function SectionHeading({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-xs text-marigold">{n}</span>
      <h2 className="font-display text-2xl font-bold text-chalk">{children}</h2>
    </div>
  );
}

export default function SwatchPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 pb-safe">
      <header className="flex flex-col gap-2">
        <Link href="/" className="font-mono text-xs text-muted-foreground hover:text-chalk">
          ← LifeLedger
        </Link>
        <h1 className="font-display text-4xl font-bold text-chalk">Design tokens</h1>
        <p className="text-sm text-muted-foreground">
          Phase 0 proof sheet. Ten colour tokens, three typefaces, rupee
          formatting.
        </p>
      </header>

      <Separator className="my-8" />

      {/* ── 1. Colour ────────────────────────────────────────────────── */}
      <SectionHeading n="01">Colour</SectionHeading>
      <p className="mt-2 mb-5 text-sm text-muted-foreground">
        Swatches paint from <code className="font-mono text-chalk">var(--token)</code>{" "}
        directly, so an unresolved token shows as a hole.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TOKENS.map((t) => (
          <div key={t.name} className="overflow-hidden rounded-lg border border-line">
            <div className="h-16 w-full" style={{ background: `var(${t.name})` }} />
            <div className="flex flex-col gap-0.5 bg-surface p-3">
              <span className="font-mono text-xs text-chalk">{t.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{t.hex}</span>
              <span className="text-[11px] text-muted-foreground">{t.role}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-line bg-surface p-4">
        <p className="text-sm leading-relaxed text-chalk">
          <span className="text-marigold">Marigold is you.</span>{" "}
          <span className="text-mint">Mint is the optimal path.</span>{" "}
          <span className="text-rust">Rust is debt.</span>{" "}
          <span className="text-violet">Violet is the coach.</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          These four never mean anything else. Colour carries data, not
          decoration.
        </p>
      </div>

      {/* Utility-class mapping proof — catches a broken @theme inline block.
          A swatch that renders transparent means the token never reached
          Tailwind. `bg-muted` intentionally resolves to surface2 and
          `bg-muted-foreground` to our secondary-text colour; see globals.css. */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-line bg-surface p-3">
        {[
          "bg-ink",
          "bg-surface",
          "bg-surface2",
          "bg-line",
          "bg-marigold",
          "bg-mint",
          "bg-rust",
          "bg-violet",
          "bg-muted",
          "bg-muted-foreground",
        ].map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className={`${c} size-4 rounded-sm border border-line`} />
            <span className="font-mono text-[10px] text-muted-foreground">{c}</span>
          </span>
        ))}
      </div>

      <Separator className="my-8" />

      {/* ── 2. Type ──────────────────────────────────────────────────── */}
      <SectionHeading n="02">Type</SectionHeading>

      <div className="mt-5 flex flex-col gap-6">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Display · Fraunces · SOFT 40 WONK 1
          </p>
          <p className="font-display mt-2 text-4xl font-bold text-chalk">
            The Cautious Compounder
          </p>
          <p className="font-display text-6xl font-bold text-marigold">Month 11</p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Body · Instrument Sans
          </p>
          <p className="mt-2 text-base leading-relaxed text-chalk">
            You skipped the SIP this month. That is ₹5,000 that did not buy units
            at a 14% discount, and the market does not wait for you to feel ready.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Numerals · IBM Plex Mono · tabular
          </p>
          <div className="mt-2 flex flex-col font-mono text-2xl text-chalk">
            {/* Tabular figures: these must align to the digit, column by column. */}
            <span>₹1,11,111</span>
            <span>₹8,88,888</span>
            <span className="text-rust">−₹2,15,000</span>
            <span className="text-mint">+₹1,94,000</span>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* ── 3. Money ─────────────────────────────────────────────────── */}
      <SectionHeading n="03">Money</SectionHeading>
      <p className="mt-2 mb-5 text-sm text-muted-foreground">
        Indian digit grouping throughout — ₹1,25,000, never ₹125,000. Rows marked{" "}
        <span className="text-marigold">gate</span> are the Phase 0 checklist.
      </p>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <tbody>
            {FORMATS.map((f) => (
              <tr key={f.call} className="border-b border-line last:border-0">
                <td
                  className={`bg-surface py-2 pr-3 pl-3 font-mono text-xs text-muted-foreground ${
                    f.gate ? "border-l-2 border-l-marigold pl-2.5" : ""
                  }`}
                >
                  {f.call}
                  {f.gate ? (
                    <span className="ml-1.5 text-[10px] text-marigold">gate</span>
                  ) : null}
                </td>
                <td className="bg-surface px-3 py-2 text-right font-mono text-sm text-chalk">
                  {f.out}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Separator className="my-8" />

      {/* ── 4. Surfaces ──────────────────────────────────────────────── */}
      <SectionHeading n="04">Surfaces and controls</SectionHeading>
      <p className="mt-2 mb-5 text-sm text-muted-foreground">
        Flat panels, 1px hairlines, no gradients, no shadows, 4px radius cap.
        shadcn primitives inherit the palette through the semantic token layer.
      </p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg">Advance month</Button>
          <Button size="lg" variant="outline">
            Read the debrief
          </Button>
          <Button size="lg" variant="secondary">
            Skip
          </Button>
          <Button size="lg" variant="destructive">
            Sell everything
          </Button>
          <Button size="lg" disabled>
            Locked
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>Compounding</Badge>
          <Badge variant="secondary">Steady</Badge>
          <Badge variant="outline">Unseen</Badge>
          <Badge variant="destructive">Fragile</Badge>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Financial health</span>
            <span className="font-mono text-sm text-chalk">64 / 100</span>
          </div>
          <Progress value={64} />
        </div>

        <div className="flex items-stretch gap-0 rounded-lg border border-line">
          <div className="flex-1 bg-surface p-3 font-mono text-xs text-muted-foreground">
            surface
          </div>
          <div className="w-px bg-line" />
          <div className="flex-1 bg-surface2 p-3 font-mono text-xs text-muted-foreground">
            surface2
          </div>
          <div className="w-px bg-line" />
          <div className="flex-1 bg-ink p-3 font-mono text-xs text-muted-foreground">
            ink
          </div>
        </div>
      </div>

      <p className="mt-10 font-mono text-xs text-muted-foreground">
        Nothing on this page may scroll horizontally at 375px.
      </p>
    </main>
  );
}
