"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { DemoSection, HowItWorksSection, FeatureSection, UseCasesSection } from "@/components";
import { GlowyWavesHero } from "@/components/ui/glowy-waves-hero-shadcnui";

export default function HomePageClient() {
  const { isLoggedIn, username } = useAuth();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#1d0d33_0%,_#150a27_14%,_#10081d_28%,_#0c0915_48%,_#09090c_72%,_#09090c_100%)] text-zinc-100">
      <header className="relative">
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/80 bg-[#09090c]/65 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 bg-blue-600 rounded-full" />
                  <div className="absolute inset-0.5 bg-white rounded-full opacity-90" />
                </div>
                <span className="text-lg font-bold text-zinc-100">Facticity</span>
              </div>
              <div className="hidden sm:flex items-center gap-6">
                <a href="#how-it-works" className="text-sm text-zinc-200 transition-colors hover:text-white">
                  How it works
                </a>
                <a href="#demo" className="text-sm text-zinc-200 transition-colors hover:text-white">
                  Demo
                </a>
                <a href="#features" className="text-sm text-zinc-200 transition-colors hover:text-white">
                  Features
                </a>
              </div>
              <div className="flex items-center gap-2">
                {isLoggedIn ? (
                  <span className="px-4 py-2 text-sm font-medium text-green-300 rounded-lg bg-green-950/20">
                    Logged in as {username}
                  </span>
                ) : (
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium bg-transparent border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
                  >
                    Login
                  </Link>
                )}
                <a
                  href="#demo"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Try Demo
                </a>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <GlowyWavesHero />

        <DemoSection />
        <HowItWorksSection />
        <FeatureSection />
        <UseCasesSection />

        <footer className="border-t border-zinc-800/80 bg-[#09090c]/55 py-12 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="relative w-6 h-6">
                  <div className="absolute inset-0 bg-blue-600 rounded-full" />
                  <div className="absolute inset-0.5 bg-white rounded-full opacity-90" />
                </div>
                <span className="text-sm font-bold text-zinc-100">Facticity</span>
              </div>
              <p className="text-sm text-zinc-200">
                Source-backed fact checking for the internet, built to keep the evidence visible.
              </p>
              <p className="text-xs text-zinc-300">Built for NTHS Hackathon 2026</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
