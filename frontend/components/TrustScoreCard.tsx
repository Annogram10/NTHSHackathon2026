"use client";

interface TrustScoreCardProps {
  score: number;
  confidence: number;
}

export function TrustScoreCard({ score, confidence }: TrustScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 75) return { bar: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-500/30" };
    if (s >= 50) return { bar: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-500/30" };
    return { bar: "bg-red-500", text: "text-red-600", ring: "ring-red-500/30" };
  };

  const getConfidenceLabel = (c: number) => {
    if (c >= 80) return { label: "High Confidence", color: "text-emerald-600" };
    if (c >= 50) return { label: "Medium Confidence", color: "text-amber-600" };
    return { label: "Low Confidence", color: "text-red-600" };
  };

  const scoreColor = getScoreColor(score);
  const confidenceInfo = getConfidenceLabel(confidence);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Trust Score
        </span>
        <span className={`text-2xl font-bold ${scoreColor.text}`}>{score}</span>
      </div>

      {/* Score bar */}
      <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${scoreColor.bar} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-xs text-zinc-500 dark:text-zinc-500">Confidence</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${confidenceInfo.color}`}>
            {confidenceInfo.label}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">({confidence}%)</span>
        </div>
      </div>

      {/* Score labels */}
      <div className="flex justify-between mt-3 text-xs text-zinc-400 dark:text-zinc-600">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
}
