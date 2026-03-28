"use client";

import { useState } from "react";
import { AnalysisInput } from "@/lib/analysisService";

interface DemoInputProps {
  onSubmit: (input: AnalysisInput) => void;
  isLoading: boolean;
  isLoggedIn: boolean;
}

const sampleClaims = [
  "The Earth is flat.",
  "Vitamin C can cure the common cold.",
  "The Great Wall of China is visible from space.",
  "The Amazon rainforest produces 20% of Earth's oxygen.",
  "Sharks are older than trees.",
];

export function DemoInput({ onSubmit, isLoading, isLoggedIn }: DemoInputProps) {
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-100">
          Fact-Check a URL or Claim
        </h3>
        <p className="mt-1 text-sm text-white/90">
          In URL mode, we fetch the page and pull the headline, publisher, and author automatically. In claim mode, you can check a statement directly.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
          {isLoggedIn ? "Connected APIs" : "Login Unlocks"}
        </span>
        {isLoggedIn ? (
          <>
            <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1 text-xs font-medium text-purple-300">
              Google Fact Check
            </span>
            <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1 text-xs font-medium text-purple-300">
              NewsAPI
            </span>
            <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1 text-xs font-medium text-purple-300">
              GNews
            </span>
            <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1 text-xs font-medium text-purple-300">
              Guardian
            </span>
          </>
        ) : (
          <span className="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1 text-xs font-medium text-zinc-300">
            Live source API checks
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-800 p-1">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === "url"
                ? "bg-zinc-950 text-zinc-100 shadow-sm"
                : "text-zinc-400"
            }`}
          >
            Check URL
          </button>
          <button
            type="button"
            onClick={() => setMode("claim")}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === "claim"
                ? "bg-zinc-950 text-zinc-100 shadow-sm"
                : "text-zinc-400"
            }`}
          >
            Check Claim
          </button>
        </div>

        {mode === "url" ? (
          <>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">
                Article URL
              </span>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.nbcnews.com/..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
              className="h-32 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              disabled={isLoading}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              {claim.length > 0 && (
                <span className="text-xs text-zinc-400">
                  {claim.length} chars
                </span>
              )}
            </div>
          </div>
        )}

        {/* Sample claim chips */}
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs text-white/90">
            Try:
          </span>
          {sampleClaims.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              disabled={isLoading}
              className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-purple-950/50 hover:text-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {chip.length > 30 ? chip.slice(0, 30) + "..." : chip}
            </button>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-white/90">
          {isLoggedIn
            ? "URL mode judges both the page source and the extracted headline. Claim mode skips the page fetch and checks the statement against connected source APIs."
            : "URL mode judges both the page source and the extracted headline. Sign in to unlock the full live source API layer for deeper verification."}
        </p>

        <button
          type="submit"
          disabled={
            isLoading ||
            (mode === "url" ? !sourceUrl.trim() : !claim.trim())
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-200 hover:bg-purple-700 hover:shadow-purple-500/40 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:shadow-none"
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
