import type { Metadata } from "next";
import "./globals.css";
import { DemoSection, HowItWorksSection, FeatureSection, UseCasesSection } from "@/components";
import { GlowyWavesHero } from "@/components/ui/glowy-waves-hero-shadcnui";

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
        <GlowyWavesHero />

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
