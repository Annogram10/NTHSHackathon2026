"use client";

import { useState, useEffect } from "react";
import { AnalysisResult, HistoryItem } from "@/types/facticity";
import { analyzeClaim, getHistory } from "@/lib/analysisService";
import { DemoInput } from "./DemoInput";
import { AnalysisResultPanel } from "./AnalysisResultPanel";
import { HistoryPanel } from "./HistoryPanel";

export function DemoSection() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  const handleAnalyze = async (claim: string) => {
    setIsLoading(true);
    setIsTransitioning(true);

    // Brief transition delay for smooth animation
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const analysisResult = await analyzeClaim(claim);
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
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleHistorySelect = (claim: string) => {
    if (!isLoading) {
      handleAnalyze(claim);
      // Scroll to demo section
      document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="demo"
      className="py-20 sm:py-28 bg-gradient-to-b from-white via-zinc-50 to-white dark:from-zinc-950 dark:via-black dark:to-zinc-950"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Try Facticity
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            Paste any claim and get an instant truth score
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input */}
            <DemoInput onSubmit={handleAnalyze} isLoading={isLoading} />

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
