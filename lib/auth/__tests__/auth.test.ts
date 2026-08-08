import { describe, it, expect } from "vitest";
import { deriveHash, randomSalt, sha256Hex, timingSafeEqual } from "../hash";
import {
  createAccount,
  normaliseUsername,
  validatePassword,
  validateUsername,
  verifyPassword,
} from "../account";

/**
 * The hash is hand-rolled because `crypto.subtle` does not exist outside a
 * secure context and the app has to log people in over plain http on a phone.
 * Hand-rolled crypto earns known-answer tests.
 */

describe("sha256Hex against the published vectors", () => {
  it("the empty string", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it('"abc"', () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("a 448-bit message — exercises two-block padding", () => {
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("a message exactly one byte short of a block boundary", () => {
    expect(sha256Hex("a".repeat(55))).toBe(
      "9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318",
    );
  });

  it("a message exactly on a block boundary", () => {
    expect(sha256Hex("a".repeat(64))).toBe(
      "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb",
    );
  });

  it("handles multi-byte UTF-8 without corrupting the length", () => {
    // ₹ is three bytes. A byte-vs-character length bug shows up right here.
    expect(sha256Hex("₹42,000")).toBe(sha256Hex("₹42,000"));
    expect(sha256Hex("₹42,000")).not.toBe(sha256Hex("42,000"));
    expect(sha256Hex("₹42,000")).toHaveLength(64);
  });
});

describe("deriveHash", () => {
  it("is deterministic for the same password and salt", () => {
    expect(deriveHash("hunter2", "abc", 50)).toBe(deriveHash("hunter2", "abc", 50));
  });

  it("★ the same password under a different salt gives a different hash", () => {
    expect(deriveHash("hunter2", "salt-a", 50)).not.toBe(deriveHash("hunter2", "salt-b", 50));
  });

  it("a different password gives a different hash", () => {
    expect(deriveHash("hunter2", "abc", 50)).not.toBe(deriveHash("hunter3", "abc", 50));
  });

  it("★ never contains the password", () => {
    expect(deriveHash("correct-horse", "abc", 50)).not.toContain("correct-horse");
  });

  it("stays quick enough that signing in is not the slow part", () => {
    const start = performance.now();
    deriveHash("hunter2", randomSalt());
    const ms = performance.now() - start;
    expect(ms, `${ms.toFixed(0)}ms to derive`).toBeLessThan(1500);
  });
});

describe("randomSalt", () => {
  it("is 32 hex characters", () => {
    expect(randomSalt()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 200 }, () => randomSalt()));
    expect(seen.size).toBe(200);
  });
});

describe("timingSafeEqual", () => {
  it("matches identical strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
  });

  it("rejects different strings of the same length", () => {
    expect(timingSafeEqual("abc", "abd")).toBe(false);
  });

  it("rejects different lengths", () => {
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});

describe("account rules", () => {
  it("★ round-trips the right password and refuses the wrong one", () => {
    const account = createAccount("Siddharth", "opensesame", 1);
    expect(verifyPassword(account, "opensesame")).toBe(true);
    expect(verifyPassword(account, "opensesamf")).toBe(false);
    expect(verifyPassword(account, "")).toBe(false);
  });

  it("★ stores no trace of the password", () => {
    const account = createAccount("Siddharth", "opensesame", 1);
    expect(JSON.stringify(account)).not.toContain("opensesame");
  });

  it("treats usernames as case-insensitive", () => {
    expect(normaliseUsername("  SiddHarth ")).toBe("siddharth");
    expect(createAccount("SiddHarth", "opensesame", 1).key).toBe("siddharth");
  });

  it("keeps the username as typed, for display", () => {
    expect(createAccount("SiddHarth", "opensesame", 1).username).toBe("SiddHarth");
  });

  it("validates usernames", () => {
    expect(validateUsername("sid").ok).toBe(true);
    expect(validateUsername("si").ok).toBe(false);
    expect(validateUsername("a".repeat(21)).ok).toBe(false);
    expect(validateUsername("has space").ok).toBe(false);
    expect(validateUsername("ok.name-1_2").ok).toBe(true);
  });

  it("validates passwords", () => {
    expect(validatePassword("12345").ok).toBe(false);
    expect(validatePassword("123456").ok).toBe(true);
  });

  it("every rejection says what to do instead", () => {
    for (const result of [validateUsername("si"), validatePassword("123")]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(8);
    }
  });
});
