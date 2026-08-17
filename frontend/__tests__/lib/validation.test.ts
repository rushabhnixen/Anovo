import { validateEmail, validatePassword, validateUsername } from "@/lib/validation";

describe("email validation (BUG-006)", () => {
  it.each(["user@gmail", "user@", "@example.com", "plainstring", "user @example.com", ""])(
    "rejects %p",
    (value) => {
      expect(validateEmail(value)).not.toBeNull();
    },
  );

  it.each(["user@example.com", "first.last@sub.example.co.uk"])("accepts %p", (value) => {
    expect(validateEmail(value)).toBeNull();
  });
});

describe("password validation (BUG-007, BUG-009)", () => {
  it.each(["        ", "abcdefg ", "letters only", "12345678", "short1", ""])(
    "rejects %p",
    (value) => {
      expect(validatePassword(value)).not.toBeNull();
    },
  );

  it.each(["password1", "Str0ngPass"])("accepts %p", (value) => {
    expect(validatePassword(value)).toBeNull();
  });

  it("rejects an emoji password (now caught by the character rule)", () => {
    // JS length is 40 UTF-16 units, so the browser's own minLength check
    // passes. Emoji are rejected outright since BUG-007's QA follow-up.
    expect(validatePassword("ab1" + "\u{1F600}".repeat(20))).not.toBeNull();
  });

  it("still enforces bcrypt's 72-byte limit for allowed characters", () => {
    // 73 ASCII characters: passes the character rule, exceeds 72 bytes.
    expect(validatePassword("a1" + "x".repeat(71))).toMatch(/too long/);
  });
});

describe("username validation (BUG-008, BUG-010)", () => {
  it.each([
    "@@@",
    "123",
    "has space",
    "brackets[]",
    "emoji\u{1F600}",
    "ab",
    "-leading",
    "trailing-",
    "x".repeat(33),
  ])("rejects %p", (value) => {
    expect(validateUsername(value)).not.toBeNull();
  });

  it.each(["validuser", "user_name", "user.name", "user-name", "a1b", "User123"])(
    "accepts %p",
    (value) => {
      expect(validateUsername(value)).toBeNull();
    },
  );
});

describe("password rejects spaces and emoji (BUG-007 QA follow-up)", () => {
  it.each([
    "abc123 456",        // space, but has letter + digit
    "pass 1234",
    "abc123\u{1F600}",   // emoji alongside letter + digit
    "\u{1F600}abc12345",
    "abc\t12345",        // tab
    "café12345",         // non-ASCII letter
  ])("rejects %p", (value) => {
    expect(validatePassword(value)).not.toBeNull();
  });

  it.each(["password1", "Str0ngPass", "P@ssw0rd!", "a1b2c3d4"])("still accepts %p", (value) => {
    expect(validatePassword(value)).toBeNull();
  });
});
