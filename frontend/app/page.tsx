import Link from "next/link";

const features = [
  {
    title: "Paraphraser",
    description: "Rewrite text with adjustable intensity using T5/PEGASUS models.",
    href: "/paraphrase",
    icon: "✏️",
    color: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  },
  {
    title: "Grammar Checker",
    description: "Detect and fix grammar, spelling, and punctuation errors.",
    href: "/grammar",
    icon: "✅",
    color: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
  },
  {
    title: "Summarizer",
    description: "Condense long texts into paragraph or bullet-point summaries.",
    href: "/summarize",
    icon: "📝",
    color: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800",
  },
  {
    title: "Translator",
    description: "Translate between 100+ languages using Helsinki-NLP OpusMT.",
    href: "/translate",
    icon: "🌍",
    color: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
  },
  {
    title: "AI Humanizer",
    description: "Transform AI-generated text into natural, human-sounding writing.",
    href: "/humanize",
    icon: "🤖",
    color: "bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800",
  },
  {
    title: "Plagiarism Checker",
    description: "Detect potential plagiarism with semantic similarity analysis.",
    href: "/plagiarism",
    icon: "🔍",
    color: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
  },
  {
    title: "Tone Detector",
    description: "Analyze text tone — formal, casual, persuasive, and more.",
    href: "/tone",
    icon: "🎭",
    color: "bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800",
  },
  {
    title: "Co-Writer",
    description: "Get AI-powered autocomplete suggestions for your writing.",
    href: "/cowriter",
    icon: "✨",
    color: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
  },
  {
    title: "AI Chat",
    description: "Chat with AI in general, creative, or academic modes.",
    href: "/chat",
    icon: "💬",
    color: "bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800",
  },
  {
    title: "Document Upload",
    description: "Upload a Word doc (.docx) and humanize or paraphrase the entire file.",
    href: "/upload",
    icon: "📄",
    color: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
  },
  {
    title: "Developer API",
    description: "Explore all endpoints with interactive Swagger / ReDoc documentation.",
    href: "/api-docs",
    icon: "🔧",
    color: "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center py-16">
        <h1 className="text-5xl font-bold mb-4 text-brand-700 dark:text-brand-300">
          Anovo
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          AI-Powered Writing Tool — Free &amp; Open Source
        </p>
        <p className="text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
          Paraphrase, check grammar, summarize, translate and humanize text using
          state-of-the-art open-source models.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`block rounded-xl border p-6 transition-transform hover:scale-105 hover:shadow-lg ${f.color}`}
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h2 className="text-lg font-semibold mb-2">{f.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{f.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
