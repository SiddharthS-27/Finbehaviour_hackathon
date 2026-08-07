import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * CLAUDE.md rule 1, enforced mechanically rather than by memory.
 *
 * `lib/sim/` must stay pure: no React, no clock, no unseeded randomness, no IO.
 * Same inputs → same outputs, always. That is what makes the shadow-agent
 * comparison honest and the stage demo reproducible.
 *
 * If this test goes red, do not add an exception — move the impure code out of
 * `lib/sim/` instead.
 */

const SIM_DIR = join(process.cwd(), "lib", "sim");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Tests may use fs, timers and the rest — they are not shipped logic.
      return entry === "__tests__" ? [] : sourceFiles(full);
    }
    return entry.endsWith(".ts") ? [full] : [];
  });
}

const BANNED: { pattern: RegExp; why: string }[] = [
  { pattern: /\bMath\.random\b/, why: "unseeded randomness — use mulberry32 from rng.ts" },
  { pattern: /\bDate\.now\b/, why: "wall-clock time — the only time is the month counter" },
  { pattern: /\bnew Date\b/, why: "wall-clock time — the only time is the month counter" },
  { pattern: /\bfetch\s*\(/, why: "network IO" },
  { pattern: /\bwindow\b/, why: "browser global" },
  { pattern: /\bdocument\b/, why: "browser global" },
  { pattern: /\blocalStorage\b/, why: "browser storage" },
  { pattern: /\bprocess\.env\b/, why: "environment access" },
  { pattern: /from\s+["']react["']/, why: "React import" },
  { pattern: /from\s+["']next\//, why: "Next.js import" },
  { pattern: /\buse[A-Z]\w*\s*\(/, why: "React hook" },
];

describe("lib/sim purity", () => {
  const files = sourceFiles(SIM_DIR);

  it("finds the engine sources", () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it.each(files.map((f) => [f.replace(process.cwd() + "/", ""), f]))(
    "%s contains nothing impure",
    (_label, file) => {
      const src = readFileSync(file, "utf8");
      // Strip comments so prose about `Date.now()` does not trip the scan.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");

      for (const { pattern, why } of BANNED) {
        expect(pattern.test(code), `${_label} uses ${pattern} — ${why}`).toBe(false);
      }
    },
  );

  it("only imports from lib/sim and content", () => {
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
      for (const spec of imports) {
        const ok =
          spec.startsWith(".") || spec.startsWith("@/lib/sim") || spec.startsWith("@/content");
        expect(ok, `${file} imports "${spec}", which is outside lib/sim and content`).toBe(true);
      }
    }
  });
});
