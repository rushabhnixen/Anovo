"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import NavDropdown from "./NavDropdown";
import PromoCodeModal from "./PromoCodeModal";
import { useAuth } from "@/lib/auth-context";

const navGroups = [
  {
    label: "Writing Tools",
    items: [
      { label: "Humanizer", href: "/humanize" },
      { label: "Paraphraser", href: "/paraphrase" },
      { label: "Grammar", href: "/grammar" },
      { label: "Co-Writer", href: "/cowriter" },
    ],
  },
  {
    label: "Analysis",
    items: [
      { label: "Summarizer", href: "/summarize" },
      { label: "Tone", href: "/tone" },
      { label: "Plagiarism", href: "/plagiarism" },
      { label: "Translator", href: "/translate" },
    ],
  },
  {
    label: "More",
    items: [
      { label: "Chat", href: "/chat" },
      { label: "Upload Doc", href: "/upload" },
      { label: "API Docs", href: "/api-docs" },
    ],
  },
];

const allLinks = navGroups.flatMap((g) => g.items);

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const { user, logout } = useAuth();

  const mobileLinkClass = (href: string) =>
    `block px-3 py-2 rounded-md text-sm font-medium ${
      pathname === href
        ? "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300"
        : "text-gray-600 dark:text-gray-400"
    }`;

  return (
    <>
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-brand-600 dark:text-brand-400 shrink-0">
            Anovo
          </Link>

          {/* Desktop: dropdown groups + auth */}
          <div className="hidden md:flex items-center gap-1">
            {navGroups.map((group) => (
              <NavDropdown key={group.label} label={group.label} items={group.items} />
            ))}

            {/* Admin link */}
            {user?.is_admin && (
              <Link
                href="/admin"
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  pathname === "/admin"
                    ? "bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                Admin
              </Link>
            )}

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Auth controls */}
            {user ? (
              <>
                {user.is_premium ? (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                    Premium
                  </span>
                ) : (
                  <button
                    onClick={() => setPromoOpen(true)}
                    className="px-2 py-1 rounded-md text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    Promo Code
                  </button>
                )}
                <span className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
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
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign in
                </Link>
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
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 px-4 py-2 flex flex-col gap-0.5 max-h-[80vh] overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {group.label}
                </div>
                {group.items.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={mobileLinkClass(link.href)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}

            {user?.is_admin && (
              <Link href="/admin" onClick={() => setMenuOpen(false)} className={mobileLinkClass("/admin")}>
                Admin
              </Link>
            )}

            <div className="h-px bg-gray-200 dark:bg-gray-800 my-1" />

            {/* Mobile auth */}
            {user ? (
              <>
                {!user.is_premium && (
                  <button
                    onClick={() => { setPromoOpen(true); setMenuOpen(false); }}
                    className="px-3 py-2 rounded-md text-sm font-medium text-left text-amber-600 dark:text-amber-400"
                  >
                    Enter Promo Code
                  </button>
                )}
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="px-3 py-2 rounded-md text-sm font-medium text-left text-gray-600 dark:text-gray-400"
                >
                  Sign out ({user.username})
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className={mobileLinkClass("/login")}>
                  Sign in
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-brand-600 dark:text-brand-400">
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
      <PromoCodeModal open={promoOpen} onClose={() => setPromoOpen(false)} />
    </>
  );
}
