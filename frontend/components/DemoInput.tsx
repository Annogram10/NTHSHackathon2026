"use client";

import { useState } from "react";
import { AnalysisInput } from "@/lib/analysisService";

interface DemoInputProps {
  onSubmit: (input: AnalysisInput) => void;
  isLoading: boolean;
}

const sampleClaims = [
  "The Earth is flat.",
  "Vitamin C can cure the common cold.",
  "The Great Wall of China is visible from space.",
  "The Amazon rainforest produces 20% of Earth's oxygen.",
  "Sharks are older than trees.",
];

export function DemoInput({ onSubmit, isLoading }: DemoInputProps) {
  const [mode, setMode] = useState<"url" | "claim">("url");
  const [claim, setClaim] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const canSubmit =
      mode === "url" ? sourceUrl.trim().length > 0 : claim.trim().length > 0;

    if (canSubmit && !isLoading) {
      onSubmit({
        claim: mode === "claim" ? claim.trim() : undefined,
        sourceUrl: sourceUrl.trim() || undefined,
      });
    }
  };

  const handleChipClick = (chip: string) => {
    setMode("claim");
    setClaim(chip);
    setSourceUrl("");
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Fact-Check a URL or Claim
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          In URL mode, we fetch the page and pull the headline, publisher, and author automatically. In claim mode, you can check a statement directly.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
          Sources
        </span>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          Wikipedia
        </span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          Britannica
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === "url"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Check URL
          </button>
          <button
            type="button"
            onClick={() => setMode("claim")}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === "claim"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Check Claim
          </button>
        </div>

        {mode === "url" ? (
          <>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Article URL
              </span>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.nbcnews.com/..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                disabled={isLoading}
              />
            </label>
          </>
        ) : (
          <div className="relative">
            <textarea
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder="Enter a claim to fact-check against reference databases..."
              className="w-full h-32 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              disabled={isLoading}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              {claim.length > 0 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {claim.length} chars
                </span>
              )}
            </div>
          </div>
        )}

        {/* Sample claim chips */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 self-center">
            Try:
          </span>
          {sampleClaims.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip.length > 30 ? chip.slice(0, 30) + "..." : chip}
            </button>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          URL mode judges both the page source and the extracted headline. Claim mode skips the page fetch and only checks the statement itself against benchmark sources.
        </p>

        <button
          type="submit"
          disabled={
            isLoading ||
            (mode === "url" ? !sourceUrl.trim() : !claim.trim())
          }
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white dark:text-zinc-100 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:shadow-none"
        >
          {isLoading ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              {mode === "url" ? "Analyze URL" : "Run Fact Check"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
