"use client";

import { HistoryItem } from "@/types/facticity";
import { VerdictBadge } from "./VerdictBadge";

interface HistoryPanelProps {
  items: HistoryItem[];
  onSelect: (claim: string) => void;
  isLoading: boolean;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function HistoryPanel({ items, onSelect, isLoading }: HistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-zinc-400">
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
          </span>
          <span className="text-sm text-zinc-500">Loading history...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-zinc-400 dark:text-zinc-500">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </span>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Recent Checks
          </h3>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">
          No claims analyzed yet. Try the demo to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-500">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Checks
        </h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">
          {items.length} total
        </span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.claim)}
            className="w-full text-left p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors">
                {formatTimeAgo(item.analyzedAt)}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold ${getScoreColor(
                    item.trustScore
                  )}`}
                >
                  {item.trustScore}
                </span>
                <VerdictBadge verdict={item.verdict} size="sm" />
              </div>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-snug">
              {item.claim}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <button className="w-full text-xs text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
          View all history
        </button>
      </div>
    </div>
  );
}
