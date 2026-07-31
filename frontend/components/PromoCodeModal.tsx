"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { redeemPromoCode } from "@/lib/api";

interface PromoCodeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PromoCodeModal({ open, onClose }: PromoCodeModalProps) {
  const { token, refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !code.trim()) return;
    setError("");
    setLoading(true);
    try {
      await redeemPromoCode(token, code.trim());
      setSuccess(true);
      refreshUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to redeem code");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCode("");
    setError("");
    setSuccess(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-1">Redeem Promo Code</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Enter a promo code to unlock Premium mode with the latest GPT-OSS and Qwen writing models.
        </p>

        {success ? (
          <div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-4">
              <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                Premium activated!
              </p>
              <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                You now have access to all available PRO models on Humanize and Paraphrase.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter promo code"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {loading ? "Redeeming..." : "Redeem"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
