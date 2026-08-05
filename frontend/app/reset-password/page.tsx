"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api";
import { PASSWORD_RULE, validatePassword } from "@/lib/validation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const invalid = validatePassword(password);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not reset your password");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-1">Link not valid</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          This page needs a reset link from your email. Request a new one to continue.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-1">Password updated</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          You can now sign in with your new password.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
        >
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">Choose a new password</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Pick something you haven&apos;t used before.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            New password
          </label>
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            aria-describedby="password-hint"
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p id="password-hint" className="text-xs text-gray-400">
            {PASSWORD_RULE}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm new password
          </label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError("");
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary for the static export used by the
  // Capacitor mobile build.
  return (
    <Suspense fallback={<div className="max-w-md mx-auto text-sm text-gray-400">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
