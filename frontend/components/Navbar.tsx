"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/lib/auth-context";

const navLinks = [
  { label: "Paraphraser", href: "/paraphrase" },
  { label: "Grammar", href: "/grammar" },
  { label: "Summarizer", href: "/summarize" },
  { label: "Translator", href: "/translate" },
  { label: "Humanizer", href: "/humanize" },
  { label: "Plagiarism", href: "/plagiarism" },
  { label: "Tone", href: "/tone" },
  { label: "Co-Writer", href: "/cowriter" },
  { label: "Chat", href: "/chat" },
  { label: "Upload Doc", href: "/upload" },
  { label: "History", href: "/history" },
  { label: "API Docs", href: "/api-docs" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const linkClass = (href: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      pathname === href
        ? "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300"
        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
    }`;

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50">
      <div className="container mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-brand-600 dark:text-brand-400">
          Anovo
        </Link>

        {/* Desktop links + auth + dark mode toggle */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}

          {/* Auth controls */}
          {user ? (
            <>
              <span className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400">
                {user.username}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass("/login")}>Sign in</Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors"
              >
                Register
              </Link>
            </>
          )}

          <ThemeToggle />
        </div>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            className="p-2 rounded-md text-gray-600 dark:text-gray-400"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 px-4 py-2 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname === link.href
                  ? "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Mobile auth */}
          {user ? (
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
              className="px-3 py-2 rounded-md text-sm font-medium text-left text-gray-600 dark:text-gray-400"
            >
              Sign out ({user.username})
            </button>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium text-brand-600 dark:text-brand-400"
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
