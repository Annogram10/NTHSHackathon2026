"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { DemoSection, HowItWorksSection, FeatureSection, UseCasesSection } from "@/components";
import { GlowyWavesHero } from "@/components/ui/glowy-waves-hero-shadcnui";

export default function HomePageClient() {
  const { isLoggedIn, username, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(120,74,255,0.16)_0%,_rgba(120,74,255,0.08)_16%,_rgba(18,18,24,0.92)_42%,_#0b0b0f_72%),linear-gradient(180deg,_#13131a_0%,_#0f1015_28%,_#0c0c11_55%,_#09090c_100%)] text-zinc-100">
      <header className="relative">
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/80 bg-[#09090c]/65 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full bg-violet-600" />
                  <div className="absolute inset-0.5 bg-white rounded-full opacity-90" />
                </div>
                <span className="text-lg font-bold text-zinc-100">Facticity</span>
              </div>
              <div className="hidden sm:flex items-center gap-6">
                {isLoggedIn ? (
                  <a href="#checker" className="text-sm text-zinc-200 transition-colors hover:text-white">
                    Checker
                  </a>
                ) : (
                  <>
                    <a href="#how-it-works" className="text-sm text-zinc-200 transition-colors hover:text-white">
                      How it works
                    </a>
                    <a href="#demo" className="text-sm text-zinc-200 transition-colors hover:text-white">
                      Demo
                    </a>
                    <a href="#features" className="text-sm text-zinc-200 transition-colors hover:text-white">
                      Features
                    </a>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isLoggedIn ? (
                  <>
                    <span className="px-4 py-2 text-sm font-medium text-green-300 rounded-lg bg-green-950/20">
                      Logged in as {username}
                    </span>
                    <button
                      type="button"
                      onClick={logout}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-violet-500"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-100 transition-colors hover:border-violet-400/60 hover:bg-violet-500/20"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-700/30 transition-all hover:bg-violet-500"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
          </div>
            </div>
          </div>
        </nav>
      </header>

      <main>
        {isLoggedIn ? (
          <div className="pt-16">
            <DemoSection checkerOnly />
          </div>
        ) : (
          <>
            <GlowyWavesHero />
            <DemoSection />
            <HowItWorksSection />
            <FeatureSection />
            <UseCasesSection />
          </>
        )}

        <footer className="border-t border-zinc-800/80 bg-[#09090c]/55 py-12 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="relative w-6 h-6">
                  <div className="absolute inset-0 rounded-full bg-violet-600" />
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
