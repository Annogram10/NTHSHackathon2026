"use client";

import { Source } from "@/types/facticity";

interface SourceCardProps {
  source: Source;
}

export function SourceCard({ source }: SourceCardProps) {
  const getCredibilityColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 75) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
          {source.title}
        </h4>
        <span
          className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${getCredibilityColor(
            source.credibilityScore
          )} bg-current/10`}
        >
          {source.credibilityScore}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {source.publisher}
        </span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {new Date(source.publishedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
        {source.summary}
      </p>

      <div className="flex items-center gap-2">
        <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
            />
          </svg>
          View Source
        </button>
        <button className="text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192a3.52 3.52 0 012.264-.14l3.924 3.924a3.52 3.52 0 012.264.14c1.131.094 1.976 1.057 1.976 2.192v1.392m-6.256 0v6.108c0 1.135-.845 2.098-1.976 2.192a3.52 3.52 0 01-2.264-.14l-3.924-3.924a3.52 3.52 0 01-2.264-.14c-1.131-.094-1.976-1.057-1.976-2.192V9.108m6.256-3.75v3.75m0 0v3.75m0-3.75h3.75m-3.75 0h-3.75"
            />
          </svg>
          Copy Link
        </button>
      </div>
    </div>
  );
}
