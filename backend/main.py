"""CredCheck Backend API - Optimized Single-File Version

FastAPI-based fact-checking service with mock data for demo.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="CredCheck API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "chrome-extension://*", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Enums
class Verdict(str, Enum):
    TRUE = "true"
    FALSE = "false"
    MISLEADING = "misleading"
    UNVERIFIABLE = "unverifiable"


class SourceReliability(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# Models
class Source(BaseModel):
    id: str
    title: str
    publisher: str
    summary: str
    url: str
    reliability: SourceReliability
    published_at: Optional[datetime] = None


class AnalysisRequest(BaseModel):
    claim: str = Field(..., min_length=5, max_length=5000)
    context: Optional[str] = Field(None, max_length=10000)


class AnalysisResult(BaseModel):
    id: str
    claim: str
    verdict: Verdict
    trust_score: int = Field(..., ge=0, le=100)
    confidence: int = Field(..., ge=0, le=100)
    explanation: str
    why_misleading: Optional[str] = None
    bias_analysis: Optional[str] = None
    core_claim: str
    sources: List[Source]
    timestamp: datetime


class AnalysisResponse(BaseModel):
    success: bool
    data: AnalysisResult


class HistoryItem(BaseModel):
    id: str
    claim: str
    verdict: Verdict
    trust_score: int
    timestamp: datetime


# In-memory storage
_history: List[AnalysisResult] = []


# Mock sources database
MOCK_SOURCES = [
    {"title": "Fact-Checking Analysis", "publisher": "Reuters", "summary": "Comprehensive verification from multiple reliable sources.", "reliability": "high"},
    {"title": "News Verification Report", "publisher": "Associated Press", "summary": "Cross-referenced with authoritative databases and experts.", "reliability": "high"},
    {"title": "Investigation Report", "publisher": "BBC Fact Check", "summary": "Independent analysis with primary source verification.", "reliability": "high"},
    {"title": "Source Analysis", "publisher": "Snopes", "summary": "Historical context and claim verification completed.", "reliability": "high"},
    {"title": "Verification Update", "publisher": "FactCheck.org", "summary": "Reviewed by subject matter experts.", "reliability": "high"},
]


def analyze_claim_content(claim: str) -> dict:
    """Analyze claim and return mock results based on content."""
    claim_lower = claim.lower()

    # Check for common false claims
    false_indicators = [
        "earth is flat", "flat earth",
        "vaccines cause autism", "vaccine autism",
        "climate change hoax", "climate change fake",
        "moon landing fake", "moon landing hoax",
        "5g causes", "5g towers",
    ]

    # Check for common true claims
    true_indicators = [
        "earth is round", "earth is spherical",
        "vaccines are safe", "vaccines work",
        "climate change real", "climate change is real",
        "moon landing happened", "humans landed on moon",
    ]

    is_false = any(ind in claim_lower for ind in false_indicators)
    is_true = any(ind in claim_lower for ind in true_indicators)

    if is_false:
        return {
            "verdict": Verdict.FALSE,
            "trust_score": 15,
            "confidence": 85,
            "explanation": "This claim has been widely debunked by scientific consensus and multiple fact-checking organizations.",
            "why_misleading": "This is a known misinformation narrative with no credible evidence supporting it.",
            "bias_analysis": "Contains conspiracy language and contradicts established facts.",
        }
    elif is_true:
        return {
            "verdict": Verdict.TRUE,
            "trust_score": 95,
            "confidence": 90,
            "explanation": "This claim is supported by overwhelming scientific evidence and expert consensus.",
            "why_misleading": None,
            "bias_analysis": "Neutral framing, factual statement.",
        }
    else:
        # Generic analysis
        import random
        random.seed(claim)  # Consistent results for same claim
        trust = random.randint(30, 75)

        if trust > 60:
            verdict = Verdict.MISLEADING
            explanation = "Some elements of this claim may be accurate, but important context is missing or distorted."
            why = "The claim oversimplifies a complex issue and omits key caveats."
            bias = "Potential framing bias detected - presents opinion as fact."
        elif trust > 40:
            verdict = Verdict.UNVERIFIABLE
            explanation = "Insufficient reliable sources available to verify this claim."
            why = None
            bias = "Unable to assess bias due to lack of verifiable information."
        else:
            verdict = Verdict.FALSE
            explanation = "This claim contradicts available evidence from reliable sources."
            why = "Key assertions are not supported by documented facts."
            bias = "Contains inflammatory language and unsupported assertions."

        return {
            "verdict": verdict,
            "trust_score": trust,
            "confidence": random.randint(40, 70),
            "explanation": explanation,
            "why_misleading": why,
            "bias_analysis": bias,
        }


def get_relevant_sources(claim: str, count: int = 3) -> List[Source]:
    """Get mock sources relevant to the claim."""
    import random
    random.seed(claim)

    sources = []
    for i, src in enumerate(random.sample(MOCK_SOURCES, min(count, len(MOCK_SOURCES)))):
        sources.append(Source(
            id=str(uuid.uuid4()),
            title=src["title"],
            publisher=src["publisher"],
            summary=src["summary"],
            url=f"https://example.com/source/{uuid.uuid4().hex[:8]}",
            reliability=SourceReliability(src["reliability"]),
        ))
    return sources


@app.get("/")
def root():
    return {"message": "CredCheck API", "docs": "/docs", "version": "1.0.0"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0", "timestamp": datetime.utcnow()}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_claim(request: AnalysisRequest):
    """Analyze a claim and return credibility results."""
    analysis_id = str(uuid.uuid4())

    # Get analysis based on claim content
    analysis = analyze_claim_content(request.claim)

    # Get sources
    sources = get_relevant_sources(request.claim)

    # Create result
    result = AnalysisResult(
        id=analysis_id,
        claim=request.claim,
        verdict=analysis["verdict"],
        trust_score=analysis["trust_score"],
        confidence=analysis["confidence"],
        explanation=analysis["explanation"],
        why_misleading=analysis.get("why_misleading"),
        bias_analysis=analysis.get("bias_analysis"),
        core_claim=request.claim[:200],
        sources=sources,
        timestamp=datetime.utcnow(),
    )

    # Store in history
    _history.append(result)

    return AnalysisResponse(success=True, data=result)


@app.get("/api/history")
async def get_history(limit: int = 10):
    """Get recent analysis history."""
    sorted_history = sorted(_history, key=lambda x: x.timestamp, reverse=True)
    return [
        HistoryItem(
            id=r.id,
            claim=r.claim[:100] + "..." if len(r.claim) > 100 else r.claim,
            verdict=r.verdict,
            trust_score=r.trust_score,
            timestamp=r.timestamp,
        )
        for r in sorted_history[:limit]
    ]


@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get a specific analysis by ID."""
    for result in _history:
        if result.id == analysis_id:
            return AnalysisResponse(success=True, data=result)
    return {"success": False, "error": "Analysis not found"}
