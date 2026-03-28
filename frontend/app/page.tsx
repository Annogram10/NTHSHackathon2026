import type { Metadata } from "next";
import "./globals.css";
import { DemoSection, HowItWorksSection, FeatureSection, UseCasesSection } from "@/components";

export const metadata: Metadata = {
  title: "Facticity - Source-Backed Fact Checking",
  description:
    "Facticity fact-checks claims against source databases like Wikipedia and Britannica, then explains the verdict with linked evidence.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <header className="relative">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 bg-blue-600 rounded-full" />
                  <div className="absolute inset-0.5 bg-white rounded-full opacity-90" />
                </div>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Facticity
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-6">
                <a
                  href="#how-it-works"
                  className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  How it works
                </a>
                <a
                  href="#demo"
                  className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Demo
                </a>
                <a
                  href="#features"
                  className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Features
                </a>
              </div>
              <a
                href="#demo"
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Demo
              </a>
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="pt-16">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl">
              <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute top-40 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
              {/* Logo / Brand */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-full mb-8">
                <div className="relative w-6 h-6">
                  <div className="absolute inset-0 bg-blue-600 rounded-full animate-pulse opacity-50" />
                  <div className="absolute inset-0.5 bg-blue-600 rounded-full" />
                  <div className="absolute inset-1 bg-white rounded-full opacity-90" />
                </div>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  Facticity
                </span>
                <span className="text-xs text-blue-600/70 dark:text-blue-400/50 font-medium">
                  Reference Fact Checker
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
                Check claims against
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">
                  trusted reference sources.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Facticity compares claims with evidence from sources like Wikipedia and Britannica, then turns that research into a clear verdict, score, and source list.
              </p>

              {/* CTA Buttons */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="#demo"
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
                >
                  Try Demo
                </a>
                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 transition-all duration-200 hover:-translate-y-0.5"
                >
                  How It Works
                </a>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-zinc-500 dark:text-zinc-500">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>No signup required</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Wikipedia + Britannica</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Source-backed verdicts</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <DemoSection />

        {/* How It Works */}
        <HowItWorksSection />

        {/* Features */}
        <FeatureSection />

        {/* Use Cases */}
        <UseCasesSection />

        {/* Footer */}
        <footer className="py-12 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="relative w-6 h-6">
                  <div className="absolute inset-0 bg-blue-600 rounded-full" />
                  <div className="absolute inset-0.5 bg-white rounded-full opacity-90" />
                </div>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Facticity
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                Source-backed fact checking for the internet, built to keep the evidence visible.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                Built for NTHS Hackathon 2026
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
