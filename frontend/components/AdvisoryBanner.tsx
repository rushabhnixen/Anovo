"use client";

/**
 * Caution shown when the backend flags input that does not look like prose
 * (JSON, source code, digits, emoji) or a draft that had to be truncated.
 *
 * The tool still runs and still shows its result — this only tells the user
 * why that result may not mean what they expect.
 */
export default function AdvisoryBanner({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div
      role="status"
      data-testid="advisory-banner"
      className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
    >
      <span aria-hidden="true" className="mt-px font-bold">
        !
      </span>
      <span>{message}</span>
    </div>
  );
}
