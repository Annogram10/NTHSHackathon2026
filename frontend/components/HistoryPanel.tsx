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
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export function HistoryPanel({ items, onSelect, isLoading }: HistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-zinc-500">
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
          <h3 className="font-semibold text-zinc-100">
            Recent Checks
          </h3>
        </div>
        <p className="py-6 text-center text-sm text-white/90">
          No claims analyzed yet. Run a check to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-purple-400">
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
        <h3 className="font-semibold text-zinc-100">
          Recent Checks
        </h3>
        <span className="ml-auto text-xs text-zinc-400">
          {items.length} total
        </span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.claim)}
            className="group w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-left transition-colors hover:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-xs text-zinc-400 transition-colors group-hover:text-zinc-300">
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
            <p className="line-clamp-2 text-sm leading-snug text-zinc-100">
              {item.claim}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-4 border-t border-zinc-800 pt-3">
        <button className="w-full text-center text-xs font-medium text-purple-300 transition-colors hover:text-purple-200">
          View all history
        </button>
      </div>
    </div>
  );
}
