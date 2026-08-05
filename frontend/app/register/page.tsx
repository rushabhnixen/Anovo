"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { registerUser } from "@/lib/api";
import {
  PASSWORD_RULE,
  USERNAME_RULE,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/validation";

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Same rules the server enforces, checked here so the user sees them before
    // a round trip.
    const nextErrors = {
      username: validateUsername(username) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
    };
    setFieldErrors(nextErrors);
    if (nextErrors.username || nextErrors.email || nextErrors.password) return;

    setLoading(true);
    try {
      const { access_token } = await registerUser(username.trim(), email.trim(), password);
      login(access_token);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = (invalid?: string) =>
    `rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 ${
      invalid
        ? "border-red-500 focus:ring-red-500"
        : "border-gray-300 dark:border-gray-700 focus:ring-brand-500"
    }`;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">Create account</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Sign up to save your history and access your work from any device.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setFieldErrors((prev) => ({ ...prev, username: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby="username-hint"
            className={fieldClass(fieldErrors.username)}
          />
          <p
            id="username-hint"
            className={`text-xs ${
              fieldErrors.username ? "text-red-600 dark:text-red-400" : "text-gray-400"
            }`}
          >
            {fieldErrors.username ?? USERNAME_RULE}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            className={fieldClass(fieldErrors.email)}
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby="password-hint"
            className={fieldClass(fieldErrors.password)}
          />
          <p
            id="password-hint"
            className={`text-xs ${
              fieldErrors.password ? "text-red-600 dark:text-red-400" : "text-gray-400"
            }`}
          >
            {fieldErrors.password ?? PASSWORD_RULE}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 dark:text-brand-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
