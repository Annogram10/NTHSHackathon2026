import { AnalysisResult, HistoryItem } from "@/types/facticity";

export const mockAnalysisResult: AnalysisResult = {
  id: "result-001",
  claim: "The Earth is the only planet in our solar system with liquid water on its surface.",
  verdict: "Misleading",
  trustScore: 72,
  confidence: 85,
  explanation:
    "While Earth does have the most abundant liquid water, recent discoveries suggest that liquid water may exist beneath the surfaces of Mars and several icy moons like Europa and Enceladus. The claim is technically true for surface water, but oversimplifies the broader picture of water in our solar system.",
  whyMisleading:
    "The statement implies Earth is uniquely special for having water, when in fact water ice and potential subsurface liquid water exist on multiple celestial bodies. This framing overstates Earth's uniqueness.",
  bias: "Neutral",
  biasExplanation:
    "The claim shows no strong partisan bias but presents an Earth-centric perspective common in popular science communication.",
  coreClaim: "Earth has liquid water on its surface, unlike other planets.",
  sources: [
    {
      id: "src-1",
      title: "NASA Confirms Evidence of Liquid Water on Mars",
      publisher: "NASA Science",
      publishedAt: "2024-09-12",
      summary:
        "NASA's Mars rovers have detected hydrated minerals and seasonal briny water flows, suggesting intermittent liquid water on the Martian surface.",
      url: "#",
      credibilityScore: 98,
    },
    {
      id: "src-2",
      title: "Ocean Worlds in the Outer Solar System",
      publisher: "Nature Astronomy",
      publishedAt: "2024-06-20",
      summary:
        "Scientists confirm that Europa, Enceladus, and Titan harbor vast subsurface oceans, with active water plumes detected from Enceladus.",
      url: "#",
      credibilityScore: 95,
    },
    {
      id: "src-3",
      title: "The Water-Rich Solar System",
      publisher: "Scientific American",
      publishedAt: "2024-03-15",
      summary:
        "A comprehensive overview of water distribution across planets, moons, and asteroids in our solar system.",
      url: "#",
      credibilityScore: 88,
    },
  ],
  simplifiedExplanation:
    "Earth does have a lot of surface water, which is rare among planets. But some other worlds—like Mars and Jupiter's moon Europa—might have water hidden underground or under ice. So water isn't as rare as the claim suggests.",
  analyzedAt: new Date().toISOString(),
};

export const mockHistoryItems: HistoryItem[] = [
  {
    id: "hist-1",
    claim: "The Earth is the only planet with liquid water on its surface.",
    verdict: "Misleading",
    trustScore: 72,
    analyzedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "hist-2",
    claim: "Climate change is causing more frequent hurricanes.",
    verdict: "True",
    trustScore: 88,
    analyzedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "hist-3",
    claim: "AI will replace all human jobs by 2030.",
    verdict: "False",
    trustScore: 25,
    analyzedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "hist-4",
    claim: "The Great Barrier Reef has lost 50% of its coral since 1995.",
    verdict: "True",
    trustScore: 91,
    analyzedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];

export const sampleClaimChips: string[] = [
  "The Earth is flat.",
  "COVID-19 vaccines cause infertility.",
  "The US economy added 300,000 jobs last month.",
  "Drinking 8 glasses of water daily is essential for health.",
  "Social media use causes depression in teenagers.",
];

export const verdictConfig = {
  True: {
    label: "True",
    color: "emerald",
    bgGradient: "from-emerald-500/10 to-emerald-600/5",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-600",
    ringColor: "ring-emerald-500/50",
  },
  False: {
    label: "False",
    color: "red",
    bgGradient: "from-red-500/10 to-red-600/5",
    borderColor: "border-red-500/30",
    textColor: "text-red-600",
    ringColor: "ring-red-500/50",
  },
  Misleading: {
    label: "Misleading",
    color: "amber",
    bgGradient: "from-amber-500/10 to-amber-600/5",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-600",
    ringColor: "ring-amber-500/50",
  },
  Unverifiable: {
    label: "Unverifiable",
    color: "slate",
    bgGradient: "from-slate-500/10 to-slate-600/5",
    borderColor: "border-slate-500/30",
    textColor: "text-slate-600",
    ringColor: "ring-slate-500/50",
  },
} as const;
