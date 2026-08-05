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

  it("rejects an emoji password that exceeds bcrypt's 72-byte limit", () => {
    // 4 bytes per emoji. JS length is 40 UTF-16 units, so the browser's own
    // minLength check passes while bcrypt would truncate it.
    expect(validatePassword("ab1" + "\u{1F600}".repeat(20))).toMatch(/too long/);
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
