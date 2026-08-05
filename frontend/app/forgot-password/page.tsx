"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/api";
import { validateEmail } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const invalid = validateEmail(email);
    if (invalid) {
      setError(invalid);
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      // The API returns the same response whether or not the address is
      // registered, so the UI must not imply the account exists.
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send the reset link");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-1">Check your email</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          If an account exists for <span className="font-medium">{email.trim()}</span>, we&apos;ve
          sent a password reset link. It expires in 30 minutes and can only be used once.
        </p>
        <Link
          href="/login"
          className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">Reset your password</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Enter the email address on your account and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            aria-invalid={Boolean(error)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
        Remembered it?{" "}
        <Link href="/login" className="text-brand-600 dark:text-brand-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
