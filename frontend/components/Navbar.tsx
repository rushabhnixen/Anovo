"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import NavDropdown from "./NavDropdown";
import PromoCodeModal from "./PromoCodeModal";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/lib/auth-context";

const workflowLinks = [
  { label: "Co-Writer", href: "/cowriter" },
  { label: "AI Chat", href: "/chat" },
  { label: "Plagiarism Check", href: "/plagiarism" },
  { label: "Developer API", href: "/api-docs" },
];

const workspaceRoutes = new Set([
  "/",
  "/paraphrase",
  "/humanize",
  "/grammar",
  "/summarize",
  "/translate",
  "/tone",
]);

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const { user, logout } = useAuth();
  const workspaceActive = workspaceRoutes.has(pathname);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="group flex items-center gap-2">
              <Image
                src="/icon-192.png"
                alt="Anovo"
                width={32}
                height={32}
                priority
                className="h-8 w-8 rounded-xl shadow-sm transition group-hover:scale-105"
              />
              <span className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Anovo</span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              <Link
                href="/"
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  workspaceActive
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                }`}
              >
                Workspace
              </Link>
              <NavDropdown label="More tools" items={workflowLinks} />
              {user?.is_premium ? (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                  ✦ PRO
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPromoOpen(true)}
                  className="ml-1 rounded-lg px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50"
                >
                  Upgrade to PRO
                </button>
              )}
              {user?.is_admin ? (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  Admin
                </Link>
              ) : null}
            </div>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {user ? (
              <>
                <Link
                  href="/account"
                  className="max-w-[120px] truncate rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  {user.username}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Get started
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="max-h-[80vh] overflow-y-auto border-t border-slate-200 px-4 py-3 md:hidden dark:border-slate-800">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            >
              Unified workspace
            </Link>
            <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              More workflows
            </p>
            {workflowLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />
            {user ? (
              <>
                <Link href="/account" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium">
                  Account settings
                </Link>
                {!user.is_premium ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPromoOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-amber-700 dark:text-amber-400"
                  >
                    Upgrade to PRO
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold dark:border-slate-700">
                  Sign in
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-bold text-white">
                  Get started
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </nav>
      <PromoCodeModal open={promoOpen} onClose={() => setPromoOpen(false)} />
    </>
  );
}
