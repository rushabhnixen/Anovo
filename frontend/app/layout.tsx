import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Anovo — AI-Powered Writing Tool",
  description:
    "Free, open-source AI writing tool: paraphraser, grammar checker, summarizer, translator and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
