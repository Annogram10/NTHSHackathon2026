import { AnalysisResult, HistoryItem } from "@/types/facticity";
import { mockAnalysisResult, mockHistoryItems } from "./mockData";

// Simulated API delay
const ANALYZE_DELAY_MS = 2200;

// Future: Replace with actual API call to FastAPI backend
// import { apiClient } from './apiClient';
// export async function analyzeClaim(claim: string): Promise<AnalysisResult> {
//   return apiClient.post('/api/v1/analyze', { claim });
// }

// Mock implementation for demo
export async function analyzeClaim(claim: string): Promise<AnalysisResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, ANALYZE_DELAY_MS));

  // Keyword-based mock selection
  const lowerClaim = claim.toLowerCase();

  if (
    lowerClaim.includes("flat") ||
    lowerClaim.includes("shape of the earth") ||
    lowerClaim.includes("globe")
  ) {
    return {
      ...mockAnalysisResult,
      id: `result-${Date.now()}`,
      claim,
      verdict: "False",
      trustScore: 15,
      confidence: 98,
      explanation:
        "The claim that the Earth is flat is demonstrably false. Satellite imagery, circumnavigation, physics, and thousands of years of observations confirm Earth is an oblate spheroid.",
      whyMisleading:
        "Flat Earth claims ignore overwhelming scientific evidence and rely on conspiracy thinking. No credible scientific institution supports this claim.",
      analyzedAt: new Date().toISOString(),
    };
  }

  if (
    lowerClaim.includes("vaccine") ||
    lowerClaim.includes("covid") ||
    lowerClaim.includes("infertility")
  ) {
    return {
      ...mockAnalysisResult,
      id: `result-${Date.now()}`,
      claim,
      verdict: "False",
      trustScore: 18,
      confidence: 94,
      explanation:
        "Extensive research involving hundreds of thousands of participants has found no link between COVID-19 vaccines and infertility. Multiple peer-reviewed studies confirm this.",
      whyMisleading:
        "This claim originated from misinterpreted preliminary data and has been repeatedly debunked by major health organizations worldwide.",
      analyzedAt: new Date().toISOString(),
    };
  }

  if (
    lowerClaim.includes("econom") ||
    lowerClaim.includes("job") ||
    lowerClaim.includes("unemployment")
  ) {
    return {
      ...mockAnalysisResult,
      id: `result-${Date.now()}`,
      claim,
      verdict: "Unverifiable",
      trustScore: 42,
      confidence: 45,
      explanation:
        "Job statistics require specific time periods, geographic scope, and methodology to verify. General claims about job numbers without supporting data cannot be confirmed.",
      whyMisleading:
        "Economic statistics are often cherry-picked or presented without proper context, methodology, or consideration of seasonal adjustments.",
      analyzedAt: new Date().toISOString(),
    };
  }

  if (
    lowerClaim.includes("water") ||
    lowerClaim.includes("health") ||
    lowerClaim.includes("drinking")
  ) {
    return {
      ...mockAnalysisResult,
      id: `result-${Date.now()}`,
      claim,
      verdict: "Unverifiable",
      trustScore: 48,
      confidence: 52,
      explanation:
        "The '8 glasses a day' rule lacks strong scientific backing. While hydration is important, individual water needs vary significantly based on body size, activity level, climate, and diet.",
      whyMisleading:
        "This claim has been repeated so often it became accepted as fact, despite weak scientific evidence for this specific number.",
      analyzedAt: new Date().toISOString(),
    };
  }

  if (
    lowerClaim.includes("social media") ||
    lowerClaim.includes("depression") ||
    lowerClaim.includes("teenager")
  ) {
    return {
      ...mockAnalysisResult,
      id: `result-${Date.now()}`,
      claim,
      verdict: "Misleading",
      trustScore: 55,
      confidence: 68,
      explanation:
        "Research shows correlation but not causation between social media use and depression in teenagers. The relationship is complex and influenced by many factors including pre-existing mental health, usage patterns, and content consumed.",
      whyMisleading:
        "Oversimplified headlines often claim direct causation when studies only show correlation. The direction of causality remains debated among researchers.",
      analyzedAt: new Date().toISOString(),
    };
  }

  if (
    lowerClaim.includes("climate") ||
    lowerClaim.includes("hurricane") ||
    lowerClaim.includes("warming")
  ) {
    return {
      ...mockAnalysisResult,
      id: `result-${Date.now()}`,
      claim,
      verdict: "True",
      trustScore: 89,
      confidence: 82,
      explanation:
        "Multiple peer-reviewed studies confirm that climate change is increasing hurricane intensity, though not necessarily frequency. Warmer oceans provide more energy for tropical storms.",
      whyMisleading:
        "The relationship is complex — while hurricane frequency hasn't clearly increased, the intensity and rainfall rates have, making this claim largely true but requiring nuance.",
      analyzedAt: new Date().toISOString(),
    };
  }

  if (
    lowerClaim.includes("ai") ||
    lowerClaim.includes("turing") ||
    lowerClaim.includes("artificial") ||
    lowerClaim.includes("replace") ||
    lowerClaim.includes("job")
  ) {
    return {
      ...mockAnalysisResult,
      id: `result-${Date.now()}`,
      claim,
      verdict: "False",
      trustScore: 22,
      confidence: 88,
      explanation:
        "AI cannot reliably pass a rigorous, blind Turing Test, and predictions of mass job displacement by specific dates have consistently proven overly pessimistic. AI augments rather than replaces most human roles.",
      whyMisleading:
        "Both AI proponents and critics tend to overstate capabilities and impacts. Current AI has significant limitations and has consistently taken longer to adopt than predicted.",
      analyzedAt: new Date().toISOString(),
    };
  }

  // Default fallback
  return {
    ...mockAnalysisResult,
    id: `result-${Date.now()}`,
    claim,
    verdict: "Unverifiable",
    trustScore: 50,
    confidence: 55,
    explanation:
      "This claim is too broad or lacks specific data to verify. Try providing more context, specific statistics, or verifiable facts.",
    whyMisleading:
      "Without specific sources or data points, we cannot assess the accuracy of this claim. Precision matters when evaluating truth.",
    analyzedAt: new Date().toISOString(),
  };
}

export async function getHistory(): Promise<HistoryItem[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockHistoryItems;
}
