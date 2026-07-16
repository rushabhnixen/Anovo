import Link from "next/link";

export const metadata = {
  title: "Privacy & Data — Anovo",
  description: "How Anovo handles writing content, account data, and deletion requests.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
      <div>
        <p className="text-sm font-medium text-brand-600 dark:text-brand-400">Last updated July 16, 2026</p>
        <h1 className="mt-1 text-3xl font-bold">Privacy and data policy</h1>
      </div>

      <section>
        <h2 className="text-xl font-semibold">Data Anovo processes</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Text and documents you submit are sent securely to Anovo&apos;s API and its configured AI processing providers to produce the result you requested. Do not submit confidential or sensitive information.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">How information is used and shared</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Anovo uses submitted content only to provide the writing feature you select, maintain account functionality, prevent abuse, and keep the service reliable. Content may be processed by infrastructure and AI service providers acting on Anovo&apos;s behalf. Anovo does not sell personal information or use submitted writing for advertising.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Account data</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          If you create an optional account, Anovo stores your username, email address, a one-way password hash, account status, and any history you explicitly save. The app stores a sign-in token on your device so you remain signed in.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Permissions and device data</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          The mobile app uses network connectivity and the system share sheet. It does not request location, contacts, camera, microphone, advertising ID, or background tracking permissions.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Storage and retention</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Writing submitted for immediate processing is not intentionally added to your saved history. Content you explicitly save remains associated with your account until you delete it or delete the account. Operational providers may retain limited request data for security and reliability under their own service terms. Account records are retained while your account is active and are removed when account deletion completes, except where limited records must be retained to meet legal or security obligations.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Security</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Data is transmitted over HTTPS. Passwords are stored as one-way hashes rather than readable passwords. No internet service can guarantee absolute security, so avoid submitting highly confidential, regulated, or sensitive material.
        </p>
      </section>

      <section id="delete-account">
        <h2 className="text-xl font-semibold">Delete your account</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          You can permanently delete your account and associated saved history from Account settings in either the mobile app or this website. Sign in, type DELETE in the confirmation field, and select Permanently delete account.
        </p>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Deletion removes the account profile, authentication record, and saved writing history. Content already processed for an unsaved request is not kept as account history. Deletion is permanent and cannot be undone.
        </p>
        <Link href="/account" className="mt-4 inline-flex rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700">
          Open account deletion
        </Link>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Children</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Anovo is a general-audience productivity service and is not directed to children under 13. Users must meet the minimum age required to consent to online services in their country or use the service with permission from a parent or legal guardian.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Policy changes and contact</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Material updates will be reflected on this page with a revised date. For privacy questions or deletion assistance, contact Soniq Infotech at{" "}
          <a className="font-medium text-brand-600 hover:underline dark:text-brand-400" href="mailto:soniqinfotech@gmail.com">
            soniqinfotech@gmail.com
          </a>
          .
        </p>
      </section>

      <p className="border-t border-gray-200 pt-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        This policy applies to the Anovo website and the Android application published by Soniq Infotech.
      </p>
    </article>
  );
}
