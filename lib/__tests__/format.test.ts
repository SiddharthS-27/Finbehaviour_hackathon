import { describe, it, expect } from "vitest";
import {
  MINUS,
  formatRupees,
  formatCompactRupees,
  formatDelta,
  formatNumber,
  formatPercent,
  formatPercentDelta,
  formatMonths,
} from "@/lib/format";

describe("formatRupees", () => {
  it("uses Indian digit grouping, not Western", () => {
    // The Phase 0 gate, literally.
    expect(formatRupees(125000)).toBe("₹1,25,000");
    expect(formatRupees(-4200)).toBe(`${MINUS}₹4,200`);
  });

  it("groups lakhs and crores correctly", () => {
    expect(formatRupees(1000)).toBe("₹1,000");
    expect(formatRupees(42000)).toBe("₹42,000");
    expect(formatRupees(215000)).toBe("₹2,15,000");
    expect(formatRupees(10000000)).toBe("₹1,00,00,000");
  });

  it("gives zero no sign", () => {
    expect(formatRupees(0)).toBe("₹0");
  });

  it("never throws on non-finite input", () => {
    expect(formatRupees(NaN)).toBe("₹0");
    expect(formatRupees(Infinity)).toBe("₹0");
  });
});

describe("formatCompactRupees", () => {
  it("falls through to full form below one lakh", () => {
    expect(formatCompactRupees(950)).toBe("₹950");
    expect(formatCompactRupees(42000)).toBe("₹42,000");
  });

  it("abbreviates lakhs and trims trailing zeros", () => {
    expect(formatCompactRupees(125000)).toBe("₹1.25L");
    expect(formatCompactRupees(215000)).toBe("₹2.15L");
    expect(formatCompactRupees(200000)).toBe("₹2L");
  });

  it("abbreviates crores", () => {
    expect(formatCompactRupees(24000000)).toBe("₹2.4Cr");
    expect(formatCompactRupees(10000000)).toBe("₹1Cr");
  });

  it("keeps the minus outside the symbol", () => {
    expect(formatCompactRupees(-125000)).toBe(`${MINUS}₹1.25L`);
  });
});

describe("formatDelta", () => {
  it("always signs a change", () => {
    expect(formatDelta(4200)).toBe("+₹4,200");
    expect(formatDelta(-4200)).toBe(`${MINUS}₹4,200`);
  });

  it("leaves zero unsigned", () => {
    expect(formatDelta(0)).toBe("₹0");
  });

  it("can abbreviate", () => {
    expect(formatDelta(-215000, { compact: true })).toBe(`${MINUS}₹2.15L`);
  });
});

describe("formatNumber", () => {
  it("groups without a symbol", () => {
    expect(formatNumber(125000)).toBe("1,25,000");
    expect(formatNumber(720)).toBe("720");
  });
});

describe("percentages", () => {
  it("renders APRs held as fractions", () => {
    expect(formatPercent(0.42)).toBe("42%");
    expect(formatPercent(0.09)).toBe("9%");
    expect(formatPercent(0.095, 1)).toBe("9.5%");
  });

  it("signs market moves", () => {
    expect(formatPercentDelta(-0.14)).toBe(`${MINUS}14%`);
    expect(formatPercentDelta(0.09)).toBe("+9%");
    expect(formatPercentDelta(0)).toBe("0%");
  });
});

describe("formatMonths", () => {
  it("speaks plainly about runway", () => {
    expect(formatMonths(0.4)).toBe("under a month");
    expect(formatMonths(1)).toBe("1 month");
    expect(formatMonths(3.7)).toBe("3.7 months");
    expect(formatMonths(99)).toBe("99+ months");
  });
});
