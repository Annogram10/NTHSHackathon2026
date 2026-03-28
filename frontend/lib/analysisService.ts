import { AnalysisResult, HistoryItem } from "@/types/vouch";

export interface AnalysisInput {
  claim?: string;
  sourceUrl?: string;
  publisher?: string;
  author?: string;
}

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types for API responses
interface ApiAnalysisResponse {
  success: boolean;
  data: {
    id: string;
    claim: string;
    verdict: string;
    trust_score: number;
    confidence: number;
    explanation: string;
    why_misleading?: string;
    bias_analysis?: string;
    core_claim: string;
    sources: Array<{
      id: string;
      title: string;
      publisher: string;
      summary: string;
      url: string;
      reliability: string;
      published_at?: string;
    }>;
    timestamp: string;
  };
}

interface ApiHistoryResponse {
  success: boolean;
  data: Array<{
    id: string;
    claim: string;
    verdict: string;
    trust_score: number;
    timestamp: string;
  }>;
}

function normalizeVerdict(verdict: string): AnalysisResult["verdict"] {
  switch (verdict.toLowerCase()) {
    case "true":
      return "True";
    case "false":
      return "False";
    case "misleading":
      return "Misleading";
    default:
      return "Unverifiable";
  }
}

function normalizeBias(bias?: string): AnalysisResult["bias"] {
  if (!bias) {
    return "Unknown";
  }

  const lowered = bias.toLowerCase();

  if (lowered.includes("left")) {
    return "Left";
  }

  if (lowered.includes("right")) {
    return "Right";
  }

  if (lowered.includes("center")) {
    return "Center";
  }

  if (lowered.includes("neutral")) {
    return "Neutral";
  }

  return "Unknown";
}

function getCredibilityScore(reliability: string, publisher: string): number {
  const sourceName = publisher.toLowerCase();

  if (
    sourceName.includes("google fact check") ||
    sourceName.includes("reuters") ||
    sourceName.includes("associated press") ||
    sourceName.includes("ap news") ||
    sourceName.includes("guardian")
  ) {
    return 95;
  }

  if (reliability === "high") {
    return 92;
  }

  if (reliability === "medium") {
    return 76;
  }

  return 60;
}

// Helper function to make API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `API call failed: ${response.status} ${response.statusText}`;

      try {
        const errorBody = await response.json();

        if (typeof errorBody?.detail === "string") {
          errorMessage = errorBody.detail;
        } else if (Array.isArray(errorBody?.detail) && errorBody.detail.length > 0) {
          const firstIssue = errorBody.detail[0];
          if (typeof firstIssue?.msg === "string") {
            errorMessage = firstIssue.msg;
          }
        }
      } catch {
        // Fall back to the HTTP status message when the response body is not JSON.
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
}

// Real API implementation
export async function analyzeClaim(input: AnalysisInput): Promise<AnalysisResult> {
  const response = await apiCall<ApiAnalysisResponse>('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({
      claim: input.claim || undefined,
      source_url: input.sourceUrl || undefined,
      publisher: input.publisher || undefined,
      author: input.author || undefined,
    }),
  });

  if (!response.success) {
    throw new Error('Analysis failed');
  }

  const data = response.data;

  // Transform API response to frontend format
  return {
    id: data.id,
    claim: data.claim,
    verdict: normalizeVerdict(data.verdict),
    trustScore: data.trust_score,
    confidence: data.confidence,
    explanation: data.explanation,
    whyMisleading: data.why_misleading || '',
    bias: normalizeBias(data.bias_analysis),
    biasExplanation: data.bias_analysis || '',
    coreClaim: data.core_claim,
    sources: data.sources.map(source => ({
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      publishedAt: source.published_at || '',
      summary: source.summary || `Reference material from ${source.publisher}.`,
      url: source.url,
      credibilityScore: getCredibilityScore(source.reliability, source.publisher),
      sourceType: source.publisher,
      reliabilityLabel: source.reliability,
    })),
    simplifiedExplanation: data.explanation,
    analyzedAt: data.timestamp,
  };
}

export async function getHistory(): Promise<HistoryItem[]> {
  const response = await apiCall<ApiHistoryResponse>('/api/history');

  if (!response.success) {
    throw new Error('Failed to fetch history');
  }

  return response.data.map(item => ({
    id: item.id,
    claim: item.claim,
    verdict: normalizeVerdict(item.verdict),
    trustScore: item.trust_score,
    analyzedAt: item.timestamp,
  }));
}
