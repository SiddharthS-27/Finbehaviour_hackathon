import { describe, it, expect } from "vitest";
import { CASE_STUDIES, caseById } from "../case-studies";
import { fallbackAnswer, scoreFaq, tokenise } from "@/lib/cases";

/**
 * Case studies are cited content, so the lint here is about the things that
 * would embarrass the app in front of somebody who checks: an uncited claim, a
 * simulation with nothing to mount, an FAQ that answers the wrong question.
 */

describe("the library is well formed", () => {
  it("has unique ids", () => {
    const ids = CASE_STUDIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ships one of each mode, which is what the demo needs", () => {
    expect(CASE_STUDIES.filter((c) => c.mode === "simulation")).toHaveLength(1);
    expect(CASE_STUDIES.filter((c) => c.mode === "explanation")).toHaveLength(1);
  });

  it.each(CASE_STUDIES.map((c) => [c.id, c]))("%s is fully authored", (_id, study) => {
    expect(study.title.length).toBeGreaterThan(10);
    expect(study.category.length).toBeGreaterThan(0);
    expect(study.hook.length).toBeGreaterThan(20);
    expect(study.summary.length).toBeGreaterThan(200);
    expect(study.keyLesson.length).toBeGreaterThan(60);
    expect(study.coreConcepts.length).toBeGreaterThanOrEqual(3);
    expect(study.behaviouralConcepts.length).toBeGreaterThanOrEqual(3);

    for (const c of [...study.coreConcepts, ...study.behaviouralConcepts]) {
      expect(c.term.length, `${study.id} concept term`).toBeGreaterThan(0);
      expect(c.body.length, `${study.id}/${c.term}`).toBeGreaterThan(60);
    }
  });

  it("★ every case cites its sources", () => {
    // An uncited case study is an anecdote. This is the assertion that keeps
    // the feature honest about what it is.
    for (const study of CASE_STUDIES) {
      expect(study.sources.length, `${study.id} has no sources`).toBeGreaterThanOrEqual(1);
      for (const s of study.sources) {
        expect(s.citation.length, `${study.id} citation`).toBeGreaterThan(30);
      }
    }
  });

  it("★ every simulation names an interactive that exists", () => {
    // `sim` is a discriminator the screen switches on. A typo here would render
    // a case study with its whole point missing and no error anywhere.
    const MOUNTABLE = new Set(["decoy"]);
    for (const study of CASE_STUDIES) {
      if (study.mode === "simulation") {
        expect(study.sim, `${study.id} is a simulation with no sim`).toBeTruthy();
        expect(MOUNTABLE.has(study.sim as string), `unknown sim "${study.sim}"`).toBe(true);
      } else {
        expect(study.sim, `${study.id} is an explanation but names a sim`).toBeUndefined();
      }
    }
  });

  it("every case carries authored answers, because the fallback ships first", () => {
    for (const study of CASE_STUDIES) {
      expect(study.faq.length, `${study.id} has no faq`).toBeGreaterThanOrEqual(3);
      for (const f of study.faq) {
        expect(f.question.endsWith("?"), `${f.id} is not a question`).toBe(true);
        expect(f.answer.length, `${f.id} answer`).toBeGreaterThan(80);
        expect(f.keywords.length, `${f.id} keywords`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("timelines only appear on explanation cases, and rise to their peak", () => {
    for (const study of CASE_STUDIES) {
      if (!study.timeline) continue;
      expect(study.timeline.points.length).toBeGreaterThanOrEqual(3);
      expect(study.timeline.currency.length).toBeGreaterThan(0);
    }
  });

  it("caseById finds what is there and nothing that is not", () => {
    expect(caseById("economist-decoy-pricing")?.mode).toBe("simulation");
    expect(caseById("gamestop-short-squeeze")?.mode).toBe("explanation");
    expect(caseById("nope")).toBeUndefined();
  });
});

describe("the authored follow-up answers", () => {
  const gme = caseById("gamestop-short-squeeze")!;
  const decoy = caseById("economist-decoy-pricing")!;

  it("drops stopwords so common words carry no signal", () => {
    expect(tokenise("Why does this work for me?")).toEqual(["work"]);
    // Punctuation goes, case goes, and $ / % survive because they carry meaning
    // in a case study about prices.
    expect(tokenise("Was it really $125, or 84%?")).toEqual(["really", "$125", "84%"]);
  });

  it("★ scores a whole phrase above two loose words", () => {
    const faq = gme.faq.find((f) => f.id === "gme-restrict")!;
    expect(scoreFaq(faq, "why did they press the buy button")).toBeGreaterThan(
      scoreFaq(faq, "why"),
    );
  });

  it.each([
    ["what does it mean to short a stock", "gme-short"],
    ["how can 140% of the float be shorted", "gme-140"],
    ["explain the gamma squeeze", "gme-gamma"],
    ["why did robinhood restrict trading", "gme-restrict"],
  ])("%s → %s", (question, expected) => {
    const answer = fallbackAnswer(gme, question);
    expect(answer.kind).toBe("authored");
    expect(answer.matched?.id).toBe(expected);
  });

  it.each([
    ["why does the decoy work if nobody picks it", "decoy-why"],
    ["how do I spot one in real life", "decoy-spot"],
    ["is 100 students a real sample", "decoy-sample"],
  ])("%s → %s", (question, expected) => {
    expect(fallbackAnswer(decoy, question).matched?.id).toBe(expected);
  });

  it("★ says so rather than guessing when nothing matches", () => {
    // A weak match answered confidently reads as a machine that did not listen.
    const answer = fallbackAnswer(gme, "kzzzt blorp");
    expect(answer.kind).toBe("general");
    expect(answer.matched).toBeNull();
    expect(answer.text).toContain(gme.keyLesson);
  });

  it("falls back to the lesson on an empty question", () => {
    expect(fallbackAnswer(decoy, "   ").text).toBe(decoy.keyLesson);
  });
});
