/**
 * Accounts, device-local.
 *
 * One account per device: signing up replaces whatever was there. That is the
 * honest shape for something with no server — pretending to hold a user
 * directory would mean the "sign in" screen was lying about what it does.
 *
 * Pure. The store owns the state; this owns the rules.
 */

import { deriveHash, randomSalt, timingSafeEqual } from "./hash";

export interface Account {
  /** As typed, for display. */
  username: string;
  /** Lowercased, for comparison. Usernames are not case-sensitive. */
  key: string;
  salt: string;
  hash: string;
  createdAt: number;
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 6;

/** Letters, digits, underscore, dot, hyphen. Nothing that needs escaping. */
const USERNAME_SHAPE = /^[a-zA-Z0-9._-]+$/;

export type Validation = { ok: true } | { ok: false; error: string };

export function validateUsername(raw: string): Validation {
  const username = raw.trim();
  if (username.length < USERNAME_MIN) {
    return { ok: false, error: `At least ${USERNAME_MIN} characters.` };
  }
  if (username.length > USERNAME_MAX) {
    return { ok: false, error: `At most ${USERNAME_MAX} characters.` };
  }
  if (!USERNAME_SHAPE.test(username)) {
    return { ok: false, error: "Letters, numbers, dot, dash and underscore only." };
  }
  return { ok: true };
}

export function validatePassword(password: string): Validation {
  if (password.length < PASSWORD_MIN) {
    return { ok: false, error: `At least ${PASSWORD_MIN} characters.` };
  }
  return { ok: true };
}

export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Never stores the password — only a salt and a stretched hash of it. */
export function createAccount(username: string, password: string, now: number): Account {
  const salt = randomSalt();
  return {
    username: username.trim(),
    key: normaliseUsername(username),
    salt,
    hash: deriveHash(password, salt),
    createdAt: now,
  };
}

export function verifyPassword(account: Account, password: string): boolean {
  return timingSafeEqual(account.hash, deriveHash(password, account.salt));
}
