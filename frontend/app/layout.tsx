import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileRuntime from "@/components/MobileRuntime";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Anovo — AI-Powered Writing Tool",
  description:
    "Free, open-source AI writing tool: paraphraser, grammar checker, summarizer, translator and more.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Anovo",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-[1440px] px-3 py-6 sm:px-6 sm:py-8">{children}</main>
          <MobileRuntime />
        </AuthProvider>
      </body>
    </html>
  );
}
