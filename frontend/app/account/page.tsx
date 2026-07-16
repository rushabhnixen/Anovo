"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCurrentUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function AccountPage() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return <p className="text-center text-gray-500 dark:text-gray-400">Loading account…</p>;
  }

  if (!user || !token) {
    return (
      <section className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold">Account settings</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400">Sign in to manage or delete your Anovo account.</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Deleting an account removes its profile, authentication record, and saved writing history. It does not require reinstalling the app.
        </p>
        <Link href="/login" className="mt-5 inline-flex rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
          Sign in
        </Link>
      </section>
    );
  }

  const deleteAccount = async () => {
    if (confirmation !== "DELETE") return;
    setDeleting(true);
    setError("");
    try {
      await deleteCurrentUser(token);
      logout();
      router.replace("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account deletion failed. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold">Account settings</h1>
        <dl className="mt-5 grid gap-3 text-sm">
          <div>
            <dt className="font-medium text-gray-500 dark:text-gray-400">Username</dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">{user.username}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500 dark:text-gray-400">Email</dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">{user.email}</dd>
          </div>
        </dl>
        <Link href="/privacy" className="mt-5 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Read the privacy and data policy
        </Link>
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
        <h2 className="text-xl font-semibold text-red-800 dark:text-red-300">Delete account</h2>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          This permanently deletes your Anovo account and associated saved history. This action cannot be undone.
        </p>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          Your username, email address, password hash, account status, and saved writing history will be removed.
        </p>
        <label htmlFor="delete-confirmation" className="mt-5 block text-sm font-medium text-red-900 dark:text-red-200">
          Type DELETE to confirm
        </label>
        <input
          id="delete-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="mt-2 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-800 dark:bg-gray-950 dark:text-gray-100"
        />
        {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
        <button
          type="button"
          onClick={deleteAccount}
          disabled={confirmation !== "DELETE" || deleting}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Permanently delete account"}
        </button>
      </section>
    </div>
  );
}
