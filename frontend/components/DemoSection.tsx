"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnalysisResult, HistoryItem } from "@/types/facticity";
import { analyzeClaim, AnalysisInput, getHistory } from "@/lib/analysisService";
import { DemoInput } from "./DemoInput";
import { AnalysisResultPanel } from "./AnalysisResultPanel";
import { HistoryPanel } from "./HistoryPanel";
import { useAuth, MAX_FREE_DEMO_USES } from "./AuthContext";

export function DemoSection({ checkerOnly = false }: { checkerOnly?: boolean }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { isLoggedIn, username, demoUses, canUseDemo, incrementDemoUsage, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyData = await getHistory();
        setHistory(historyData);
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setIsHistoryLoading(false);
      }
    };
    loadHistory();
  }, []);

  const handleAnalyze = async (input: AnalysisInput) => {
    if (!canUseDemo) {
      setError(
        "Free demo limit reached (3 uses). Please log in to continue with unlimited checks."
      );
      return;
    }

    if (!isLoggedIn) {
      incrementDemoUsage();
    }

    setIsLoading(true);
    setIsTransitioning(true);
    setError(null);

    // Brief transition delay for smooth animation
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const analysisResult = await analyzeClaim(input);
      setResult(analysisResult);

      // Update history
      const newHistoryItem: HistoryItem = {
        id: analysisResult.id,
        claim: analysisResult.claim,
        verdict: analysisResult.verdict,
        trustScore: analysisResult.trustScore,
        analyzedAt: analysisResult.analyzedAt,
      };
      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error("Analysis failed:", error);
      setResult(null);
      setError(
        "We could not complete the fact check right now. Make sure the backend is running so trusted source APIs can be queried."
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleHistorySelect = (claim: string) => {
    if (!isLoading) {
      handleAnalyze({ claim });
      // Scroll to demo section
      document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id={checkerOnly ? "checker" : "demo"}
      className="bg-transparent py-20 sm:py-28"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {checkerOnly ? "Fact Checker" : "Check with Facticity"}
          </h2>
          <p className="mt-4 text-lg text-white/90">
            Check a claim against trusted sources and review the evidence behind the verdict
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-white">
            {isLoggedIn ? (
              <>
                <span className="rounded-full border border-zinc-700 bg-zinc-950/65 px-3 py-1.5">
                  Fact-check APIs
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-950/65 px-3 py-1.5">
                  News validation
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-950/65 px-3 py-1.5">
                  Evidence links
                </span>
              </>
            ) : (
              <>
                <span className="rounded-full border border-zinc-700 bg-zinc-950/65 px-3 py-1.5">
                  Source scoring
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-950/65 px-3 py-1.5">
                  Claim review
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-950/65 px-3 py-1.5">
                  Sign in for live APIs
                </span>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-200">
            {isLoggedIn ? (
              <>
                <p>
                  Logged in as <strong>{username}</strong>. Unlimited access enabled.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800"
                  >
                    Logout
                  </button>
                  <Link
                    href="/download"
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                  >
                    Download Extension
                  </Link>
                </div>
              </>
            ) : (
              <p>
                Free checks: {demoUses}/{MAX_FREE_DEMO_USES}. Log in to unlock the live API source layer and unlimited access.
              </p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input */}
            <DemoInput onSubmit={handleAnalyze} isLoading={isLoading} isLoggedIn={isLoggedIn} />

            {/* Results */}
            <div
              className={`transition-all duration-300 ${
                isTransitioning
                  ? "opacity-0 translate-y-4"
                  : "opacity-100 translate-y-0"
              }`}
            >
              {result && !isLoading && (
                <AnalysisResultPanel result={result} />
              )}
            </div>

            {error && !isLoading && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div className="animate-pulse space-y-4">
                <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
                <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <HistoryPanel
                items={history}
                onSelect={handleHistorySelect}
                isLoading={isHistoryLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
