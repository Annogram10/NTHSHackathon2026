export type Verdict = "True" | "False" | "Misleading" | "Unverifiable";

export type BiasDirection = "Left" | "Center" | "Right" | "Neutral" | "Unknown";

export interface Source {
  id: string;
  title: string;
  publisher: string;
  publishedAt: string;
  summary: string;
  url: string;
  credibilityScore: number;
}

export interface AnalysisResult {
  id: string;
  claim: string;
  verdict: Verdict;
  trustScore: number;
  confidence: number;
  explanation: string;
  whyMisleading: string;
  bias: BiasDirection;
  biasExplanation: string;
  coreClaim: string;
  sources: Source[];
  simplifiedExplanation: string;
  analyzedAt: string;
}

export interface HistoryItem {
  id: string;
  claim: string;
  verdict: Verdict;
  trustScore: number;
  analyzedAt: string;
}
