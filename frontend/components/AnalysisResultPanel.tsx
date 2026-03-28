"use client";

import { useState } from "react";
import { AnalysisResult, Verdict } from "@/types/facticity";
import { VerdictBadge } from "./VerdictBadge";
import { TrustScoreCard } from "./TrustScoreCard";
import { SourceCard } from "./SourceCard";

interface AnalysisResultPanelProps {
  result: AnalysisResult;
}

function BiasCard({
  bias,
  biasExplanation,
}: {
  bias: string;
  biasExplanation: string;
}) {
  const getBiasColor = (b: string) => {
    switch (b.toLowerCase()) {
      case "left":
        return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20";
      case "right":
        return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20";
      case "neutral":
        return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20";
      default:
        return "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/20";
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-500">
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
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </span>
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Bias & Framing Analysis
        </h4>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${getBiasColor(
            bias
          )}`}
        >
          {bias}
        </span>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{biasExplanation}</p>
    </div>
  );
}

function ClaimBreakdownCard({ coreClaim }: { coreClaim: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-500">
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
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
        </span>
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Core Claim
        </h4>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">
        &ldquo;{coreClaim}&rdquo;
      </p>
    </div>
  );
}

function WhyMisleadingCard({ whyMisleading }: { whyMisleading: string }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-5 border border-amber-200 dark:border-amber-800/30 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-600 dark:text-amber-400">
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
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </span>
        <h4 className="font-semibold text-amber-900 dark:text-amber-100">
          Why This May Be Misleading
        </h4>
      </div>
      <p className="text-sm text-amber-800 dark:text-amber-200">{whyMisleading}</p>
    </div>
  );
}

function SimplifiedExplanation({
  explanation,
}: {
  explanation: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-5 border border-blue-200 dark:border-blue-800/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-blue-600 dark:text-blue-400">
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
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          </span>
          <h4 className="font-semibold text-blue-900 dark:text-blue-100">
            Explain This Simply
          </h4>
        </div>
        <svg
          className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/50">
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}

export function AnalysisResultPanel({ result }: AnalysisResultPanelProps) {
  const [showSources, setShowSources] = useState(true);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Verdict + Trust Score Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch">
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Verdict
          </span>
          <VerdictBadge verdict={result.verdict as Verdict} size="lg" />
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 max-w-xs">
            {result.explanation.slice(0, 120)}...
          </p>
        </div>
        <div className="flex-1">
          <TrustScoreCard score={result.trustScore} confidence={result.confidence} />
        </div>
      </div>

      {/* Full Explanation */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          AI Analysis
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {result.explanation}
        </p>
      </div>

      {/* Why Misleading */}
      <WhyMisleadingCard whyMisleading={result.whyMisleading} />

      {/* Bias Analysis */}
      <BiasCard bias={result.bias} biasExplanation={result.biasExplanation} />

      {/* Core Claim */}
      <ClaimBreakdownCard coreClaim={result.coreClaim} />

      {/* Sources */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowSources(!showSources)}
          className="w-full flex items-center justify-between p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">
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
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </span>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Reliable Sources
            </h4>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              ({result.sources.length})
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
              showSources ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>

        {showSources && (
          <div className="px-5 pb-5 grid gap-3">
            {result.sources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        )}
      </div>

      {/* Simplified Explanation */}
      <SimplifiedExplanation explanation={result.simplifiedExplanation} />

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>
          Copy
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
            />
          </svg>
          Share
        </button>
      </div>
    </div>
  );
}
