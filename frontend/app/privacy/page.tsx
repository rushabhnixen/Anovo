import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Anovo",
  description: "How Anovo and the Anovo Chrome extension handle writing, account, and browser data.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
        Anovo
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Effective July 31, 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-7 text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">What Anovo processes</h2>
          <p className="mt-2">
            Anovo processes text that you intentionally enter, paste, upload, or select for a writing action.
            The Chrome extension only accesses selected text after you invoke Anovo from its popup, side panel,
            or context menu. It does not collect your browsing history or continuously read pages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">How text is used</h2>
          <p className="mt-2">
            Submitted text is sent over HTTPS to the Anovo API so it can provide paraphrasing, humanization,
            grammar, summarization, translation, and tone features. Depending on availability, the API may send
            that text to configured inference providers such as Groq or Hugging Face. Anovo does not sell submitted
            text or use it to train its own models.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Accounts and local storage</h2>
          <p className="mt-2">
            If you sign in, Anovo stores the account information needed to authenticate you and provide your plan.
            The extension stores your authentication token and writing preferences in Chrome&apos;s local extension
            storage. Passwords are sent only to the Anovo API during sign-in and are not stored by the extension.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Sharing and retention</h2>
          <p className="mt-2">
            Data is shared only with service providers needed to operate the requested feature. Text processed from
            the extension is not added to Anovo history. Website history is saved only when you explicitly use a
            history-saving feature. Providers may retain limited operational or abuse-prevention logs under their
            own policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Chrome Web Store limited use</h2>
          <p className="mt-2">
            Anovo&apos;s use of information received from Chrome APIs complies with the Chrome Web Store User Data
            Policy, including its Limited Use requirements. Data is used only to deliver and improve the
            user-facing writing features, is not used for advertising, and is not made available for humans to read
            except where required for security, legal compliance, or support requested by the user.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Your controls</h2>
          <p className="mt-2">
            You can edit a result before using it, clear extension data by removing the extension, sign out to remove
            its stored token, and delete your Anovo account from the account page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Contact</h2>
          <p className="mt-2">
            For privacy questions or deletion assistance, open an issue in the{" "}
            <a
              href="https://github.com/rushabhnixen/Anovo"
              className="font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-400"
            >
              Anovo repository
            </a>
            .
          </p>
        </section>
      </div>

      <Link
        href="/"
        className="mt-10 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
      >
        Return to Anovo
      </Link>
    </article>
  );
}
