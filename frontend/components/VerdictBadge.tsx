"use client";

import { Verdict } from "@/types/vouch";

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: "sm" | "md" | "lg";
}

const verdictStyles = {
  True: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    text: "text-emerald-600",
    darkBg: "dark:bg-emerald-500/15",
    darkBorder: "dark:border-emerald-500/50",
    darkText: "dark:text-emerald-400",
    shadow: "shadow-emerald-500/20",
    ring: "ring-emerald-500/30",
  },
  False: {
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    text: "text-red-600",
    darkBg: "dark:bg-red-500/15",
    darkBorder: "dark:border-red-500/50",
    darkText: "dark:text-red-400",
    shadow: "shadow-red-500/20",
    ring: "ring-red-500/30",
  },
  Misleading: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    text: "text-amber-600",
    darkBg: "dark:bg-amber-500/15",
    darkBorder: "dark:border-amber-500/50",
    darkText: "dark:text-amber-400",
    shadow: "shadow-amber-500/20",
    ring: "ring-amber-500/30",
  },
  Unverifiable: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/40",
    text: "text-slate-600",
    darkBg: "dark:bg-slate-500/15",
    darkBorder: "dark:border-slate-500/50",
    darkText: "dark:text-slate-400",
    shadow: "shadow-slate-500/20",
    ring: "ring-slate-500/30",
  },
};

const sizeStyles = {
  sm: "text-xs px-2.5 py-1",
  md: "text-sm px-3.5 py-1.5",
  lg: "text-lg px-5 py-2",
};

export function VerdictBadge({ verdict, size = "md" }: VerdictBadgeProps) {
  const style = verdictStyles[verdict];
  const sizeStyle = sizeStyles[size];

  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-full
        ${style.bg} ${style.border} ${style.text}
        dark:${style.darkBg} dark:${style.darkBorder} dark:${style.darkText}
        ${sizeStyle}
        shadow-lg ${style.shadow}
        ring-2 ${style.ring}
        transition-all duration-200
      `}
    >
      {verdict === "True" && (
        <svg
          className="w-3.5 h-3.5 mr-1.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {verdict === "False" && (
        <svg
          className="w-3.5 h-3.5 mr-1.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {verdict === "Misleading" && (
        <svg
          className="w-3.5 h-3.5 mr-1.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      )}
      {verdict === "Unverifiable" && (
        <svg
          className="w-3.5 h-3.5 mr-1.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          />
        </svg>
      )}
      {verdict}
    </span>
  );
}
