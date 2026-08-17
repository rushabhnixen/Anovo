/**
 * Client-side mirror of the rules enforced in backend/models/schemas.py.
 *
 * The server remains the source of truth — these exist so users see the problem
 * before submitting, not to replace server validation.
 */

export const USERNAME_RULE =
  "Username must be 3-32 characters, contain at least one letter, and use only letters, numbers, dots, underscores or hyphens.";

export const PASSWORD_RULE =
  "Password must be at least 8 characters, include at least one letter and one number, and contain no spaces or emoji.";

const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

// QA follow-up on BUG-007: "abc123 <emoji>" satisfied letter+digit and was
// accepted. Spaces and emoji are rejected outright — printable ASCII only.
const ALLOWED_PASSWORD_CHARS = /^[!-~]+$/;

// bcrypt truncates past 72 bytes. Emoji cost 4 bytes each, so a password can be
// well under 128 characters and still be too long.
const BCRYPT_MAX_BYTES = 72;

/**
 * UTF-8 byte length, counted directly rather than via TextEncoder so this
 * module has no environment dependency. Mirrors Python's
 * `len(value.encode("utf-8"))`, which is what the server checks.
 */
function byteLength(value: string): number {
  let bytes = 0;
  // Iterating a string with for...of yields whole code points, so surrogate
  // pairs (emoji) are counted once.
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

/** Returns an error message, or null when valid. */
export function validateUsername(value: string): string | null {
  const candidate = value.trim();
  if (candidate.length < 3 || candidate.length > 32) return USERNAME_RULE;
  if (!USERNAME_RE.test(candidate)) return USERNAME_RULE;
  if (!/[A-Za-z]/.test(candidate)) return USERNAME_RULE;
  return null;
}

/** Returns an error message, or null when valid. */
export function validatePassword(value: string): string | null {
  if (value.length < 8) return PASSWORD_RULE;
  if (!value.trim()) return PASSWORD_RULE;
  if (!ALLOWED_PASSWORD_CHARS.test(value)) return PASSWORD_RULE;
  if (!/[A-Za-z]/.test(value)) return PASSWORD_RULE;
  if (!/[0-9]/.test(value)) return PASSWORD_RULE;
  if (byteLength(value) > BCRYPT_MAX_BYTES) {
    return `Password is too long (max ${BCRYPT_MAX_BYTES} bytes). Emoji and accented characters count as more than one byte.`;
  }
  return null;
}

/**
 * Mirrors pydantic's EmailStr closely enough to catch the common cases the
 * browser's own type="email" check lets through — notably a missing TLD, which
 * is why "user@gmail" was reaching the server.
 */
export function validateEmail(value: string): string | null {
  const candidate = value.trim();
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(candidate)) {
    return "Enter a valid email address, for example name@example.com.";
  }
  return null;
}
