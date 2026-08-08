import { describe, it, expect } from "vitest";
import {
  acceptIfHonest,
  allowedFrom,
  auditNumbers,
  factsIn,
  normalise,
  renderings,
} from "../numbers";

/**
 * ★ CLAUDE.md rule 3, tested.
 *
 * "The LLM never computes" is a claim about the product, not a hope about the
 * prompt. This is the enforcement, so it gets the adversarial tests: the cases
 * that matter are the ones where a model quietly changes a figure by a hundred
 * rupees, or restates ₹4,38,289 as ₹4.4 lakh, or slips in a plausible number
 * nobody supplied.
 */

const FACTS = [438289, 42000, 3000, 12, 3, 750];

describe("normalise", () => {
  it("folds every way a rupee figure gets written", () => {
    expect(normalise("₹4,38,289")).toBe("438289");
    expect(normalise("438289")).toBe("438289");
    expect(normalise("−₹4.38L")).toBe("4.38l");
    expect(normalise("₹4.38 L")).toBe("4.38l");
    expect(normalise("4.4 lakh")).toBe("4.4l");
    expect(normalise("2 crores")).toBe("2cr");
  });
});

describe("renderings", () => {
  it("covers the forms the UI itself produces", () => {
    const forms = renderings(438289).map(normalise);
    expect(forms).toContain("438289");
    expect(forms).toContain("4.38l");
    // A model writing "4.4L" is rounding a figure it was given, not inventing.
    expect(forms).toContain("4.4l");
  });

  it("does not care about sign", () => {
    expect(renderings(-42000).map(normalise)).toContain("42000");
  });
});

describe("auditNumbers", () => {
  it("passes prose that only quotes what it was given", () => {
    const text =
      "Month 6 cost you ₹4,38,289 — that is more than ten times your ₹42,000 take-home. Taking the raise into savings first would have kept it.";
    expect(auditNumbers(text, FACTS).ok).toBe(true);
  });

  it("★ catches a figure nobody supplied", () => {
    const audit = auditNumbers("You lost ₹5,12,000 over the year.", FACTS);
    expect(audit.ok).toBe(false);
    expect(audit.invented).toContain("₹5,12,000");
  });

  it("★ catches a figure that was quietly adjusted", () => {
    // The single most dangerous failure: close enough to look right.
    const audit = auditNumbers("Month 6 cost you ₹4,38,000.", FACTS);
    expect(audit.ok).toBe(false);
  });

  it("accepts the compact form of a supplied figure", () => {
    expect(auditNumbers("That month cost ₹4.38L.", FACTS).ok).toBe(true);
    expect(auditNumbers("That month cost ₹4.4L.", FACTS).ok).toBe(true);
  });

  it("lets small bare numbers through — counts are prose, not money", () => {
    const text = "You took the better option 3 times out of 12, and your CIBIL is 750.";
    expect(auditNumbers(text, FACTS).ok).toBe(true);
  });

  it("★ but never lets a rupee sign through unchecked, however small", () => {
    expect(auditNumbers("It cost you ₹50.", FACTS).ok).toBe(false);
    expect(auditNumbers("It cost you ₹3,000.", FACTS).ok).toBe(true);
  });

  it("catches an unsupplied four-digit number with no symbol", () => {
    expect(auditNumbers("You are down 51200 on the year.", FACTS).ok).toBe(false);
  });

  it("survives text with no numbers at all", () => {
    expect(auditNumbers("You skipped the SIP this month. Start it again.", FACTS).ok).toBe(true);
  });

  it("survives an empty allow-list without accepting money", () => {
    expect(auditNumbers("It cost ₹1,000.", []).ok).toBe(false);
    expect(auditNumbers("No figures here.", []).ok).toBe(true);
  });
});

describe("acceptIfHonest", () => {
  it("passes clean text straight through", () => {
    const { text } = acceptIfHonest("You put ₹3,000 aside.", FACTS);
    expect(text).toBe("You put ₹3,000 aside.");
  });

  it("★ discards the whole response over one bad figure", () => {
    // No repair pass and no partial acceptance. A response with an invented
    // number is a response that computed something, which is the one thing it
    // must not do — and the authored fallback is already good.
    const { text, invented } = acceptIfHonest(
      "You put ₹3,000 aside, which leaves ₹9,99,999.",
      FACTS,
    );
    expect(text).toBeNull();
    expect(invented).toEqual(["₹9,99,999"]);
  });

  it("null in, null out", () => {
    expect(acceptIfHonest(null, FACTS).text).toBeNull();
  });
});

describe("factsIn", () => {
  it("finds every number, however deeply nested", () => {
    const payload = {
      month: 6,
      costliest: [{ costRupees: 438289, nested: { deeper: [42000] } }],
      label: "not a number",
      flag: true,
    };
    expect(factsIn(payload).sort((a, b) => a - b)).toEqual([6, 42000, 438289]);
  });

  it("skips non-finite values rather than poisoning the allow-list", () => {
    expect(factsIn({ a: NaN, b: Infinity, c: 12 })).toEqual([12]);
  });

  it("★ a payload's own numbers are exactly what a response may quote", () => {
    const payload = { netWorthDelta: -3723, stress: 24 };
    const allowed = factsIn(payload);
    expect(auditNumbers("Net worth moved ₹3,723 and stress is 24.", allowed).ok).toBe(true);
    expect(auditNumbers("Net worth moved ₹3,724.", allowed).ok).toBe(false);
  });
});

describe("★ allowedFrom — numbers quoted out of supplied strings", () => {
  const payload = {
    month: 1,
    // The authored choice label carries a figure the numeric fields never see.
    choiceLabel: "Treat the team, send ₹5,000 home",
    eventTitle: "First salary",
    netWorthDelta: -3723,
    costliest: [{ eventTitle: "No-cost EMI — ₹4,167 × 12", costRupees: 52253 }],
  };

  it("lets the model quote a figure from a label it was handed", () => {
    const allowed = allowedFrom(payload);
    expect(auditNumbers("You sent ₹5,000 home and it felt good.", allowed).ok).toBe(true);
    expect(auditNumbers("That EMI is ₹4,167 a month for a year.", allowed).ok).toBe(true);
  });

  it("still covers the numeric fields", () => {
    const allowed = allowedFrom(payload);
    expect(auditNumbers("Net worth moved ₹3,723.", allowed).ok).toBe(true);
    expect(auditNumbers("It cost ₹52,253.", allowed).ok).toBe(true);
  });

  it("★ and still catches anything that was never supplied at all", () => {
    const allowed = allowedFrom(payload);
    expect(auditNumbers("You sent ₹5,500 home.", allowed).ok).toBe(false);
    expect(auditNumbers("That EMI is ₹4,168 a month.", allowed).ok).toBe(false);
  });

  it("this is what the first build got wrong", () => {
    // The numeric-only allow-list rejected an entirely honest quote, so every
    // coach line for month 1 was silently discarded. Caught by the gate, not by
    // a unit test — hence this one.
    const numericOnly = factsIn(payload);
    expect(auditNumbers("You sent ₹5,000 home.", numericOnly).ok).toBe(false);
    expect(auditNumbers("You sent ₹5,000 home.", allowedFrom(payload)).ok).toBe(true);
  });
});
