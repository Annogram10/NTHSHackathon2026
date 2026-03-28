"""CredCheck Backend API.

FastAPI-based fact-checking service with benchmark sources and
basic website/domain credibility signals.
"""

import json
import os
import re
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from services.source_service import (
    fetch_article_metadata,
    search_all_sources,
    verify_claim_with_sources,
)

load_dotenv()

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
    claim: Optional[str] = Field(None, min_length=5, max_length=5000)
    context: Optional[str] = Field(None, max_length=10000)
    source_url: Optional[str] = Field(None, max_length=2000)
    publisher: Optional[str] = Field(None, max_length=200)
    author: Optional[str] = Field(None, max_length=200)


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

HIGH_CREDIBILITY_DOMAINS = {
    "apnews.com": 88,
    "bbc.com": 86,
    "britannica.com": 95,
    "cdc.gov": 96,
    "nasa.gov": 97,
    "nbcnews.com": 84,
    "nih.gov": 96,
    "npr.org": 87,
    "nytimes.com": 84,
    "reuters.com": 92,
    "washingtonpost.com": 82,
    "wsj.com": 84,
}

LOW_CREDIBILITY_DOMAINS = {
    "beforeitsnews.com": 18,
    "infowars.com": 10,
    "naturalnews.com": 12,
}

SATIRE_DOMAINS = {
    "babylonbee.com": "Known satire site",
    "clickhole.com": "Known satire site",
    "hard-drive.net": "Known satire site",
    "reductress.com": "Known satire site",
    "thebeaverton.com": "Known satire site",
    "theonion.com": "Known satire site",
}

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini")


def extract_domain(source_url: Optional[str], claim: str) -> Optional[str]:
    """Extract a clean domain from a provided URL or claim text."""
    candidate = source_url

    if not candidate:
        match = re.search(r"https?://[^\s]+", claim)
        if match:
            candidate = match.group(0)

    if not candidate:
        return None

    parsed = urlparse(candidate if "://" in candidate else f"https://{candidate}")
    domain = parsed.netloc.lower().strip()

    if domain.startswith("www."):
        domain = domain[4:]

    return domain or None


def domain_matches(domain: str, known_domain: str) -> bool:
    return domain == known_domain or domain.endswith(f".{known_domain}")


def classify_domain(domain: Optional[str]) -> dict:
    """Return credibility information for a publisher domain."""
    if not domain:
        return {
            "score": 50,
            "reliability": SourceReliability.MEDIUM,
            "summary": "No website was provided, so domain credibility could not be evaluated.",
            "is_satire": False,
        }

    for satire_domain, reason in SATIRE_DOMAINS.items():
        if domain_matches(domain, satire_domain):
            return {
                "score": 8,
                "reliability": SourceReliability.LOW,
                "summary": f"{domain} is classified as satire. {reason}.",
                "is_satire": True,
            }

    for trusted_domain, score in HIGH_CREDIBILITY_DOMAINS.items():
        if domain_matches(domain, trusted_domain):
            return {
                "score": score,
                "reliability": SourceReliability.HIGH,
                "summary": f"{domain} is treated as a relatively credible publisher domain.",
                "is_satire": False,
            }

    for risky_domain, score in LOW_CREDIBILITY_DOMAINS.items():
        if domain_matches(domain, risky_domain):
            return {
                "score": score,
                "reliability": SourceReliability.LOW,
                "summary": f"{domain} is treated as a low-credibility domain based on known reliability concerns.",
                "is_satire": False,
            }

    return {
        "score": 50,
        "reliability": SourceReliability.MEDIUM,
        "summary": f"{domain} is not yet classified, so it receives a neutral website credibility baseline.",
        "is_satire": False,
    }


def author_signal(author: Optional[str]) -> tuple[int, str]:
    """Small credibility adjustment for article authorship."""
    if not author or not author.strip():
        return (-6, "No author was provided, which slightly lowers confidence.")

    normalized = author.strip().lower()
    if normalized in {"staff", "editorial staff", "unknown", "anonymous"}:
        return (-3, "The article has a generic or unclear author attribution.")

    return (6, f"Author byline detected: {author.strip()}.")


def benchmark_signal(sources: List[Source]) -> dict:
    """Score how much trusted-source support was found."""
    if not sources:
        return {
            "score": 38,
            "confidence": 42,
            "summary": "No matches were found from the configured trusted news and fact-check source APIs for this query.",
        }

    high_quality_count = sum(
        1 for source in sources if source.reliability == SourceReliability.HIGH
    )
    score = min(90, 45 + high_quality_count * 12 + len(sources) * 4)
    confidence = min(92, 48 + high_quality_count * 11)
    publishers = sorted({source.publisher for source in sources})

    return {
        "score": score,
        "confidence": confidence,
        "summary": (
            "Trusted source matches found in "
            + ", ".join(publishers)
            + f" ({len(sources)} total source match{'es' if len(sources) != 1 else ''})."
        ),
    }


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


def combine_analysis(
    claim: str,
    base_analysis: dict,
    sources: List[Source],
    source_url: Optional[str],
    publisher: Optional[str],
    author: Optional[str],
) -> dict:
    """Blend claim-content analysis with site credibility and benchmark sources."""
    domain = extract_domain(source_url, claim)
    domain_info = classify_domain(domain)
    benchmark_info = benchmark_signal(sources)
    author_delta, author_summary = author_signal(author)

    if domain_info["is_satire"]:
        trust_score = min(base_analysis["trust_score"], 12)
        confidence = max(base_analysis["confidence"], 88)
        verdict = Verdict.FALSE if base_analysis["verdict"] != Verdict.TRUE else Verdict.MISLEADING
        explanation = (
            f"This looks like satire rather than a credible news report. "
            f"{domain_info['summary']} Benchmark sources are used only as reference checks, not as proof that the satire headline is reporting real news."
        )
        why_misleading = (
            "Satire outlets intentionally publish fictional or exaggerated headlines, so the publisher itself is a strong warning sign."
        )
        bias_analysis = "Satirical framing detected from the source domain."
        return {
            "verdict": verdict,
            "trust_score": trust_score,
            "confidence": confidence,
            "explanation": explanation,
            "why_misleading": why_misleading,
            "bias_analysis": bias_analysis,
            "domain": domain,
            "domain_reliability": domain_info["reliability"],
            "domain_summary": domain_info["summary"],
        }

    website_score = max(0, min(100, domain_info["score"] + author_delta))
    trust_score = round(
        (base_analysis["trust_score"] * 0.45)
        + (benchmark_info["score"] * 0.30)
        + (website_score * 0.25)
    )
    confidence = round(
        (base_analysis["confidence"] * 0.45)
        + (benchmark_info["confidence"] * 0.35)
        + (max(35, website_score) * 0.20)
    )

    if trust_score >= 78:
        verdict = Verdict.TRUE
    elif trust_score >= 58:
        verdict = Verdict.MISLEADING
    elif trust_score >= 36:
        verdict = Verdict.UNVERIFIABLE
    else:
        verdict = Verdict.FALSE

    source_label = publisher or domain or "the submitted source"
    explanation_parts = [
        base_analysis["explanation"],
        benchmark_info["summary"],
        f"Website credibility check for {source_label}: {domain_info['summary']}",
        author_summary,
    ]

    why_misleading = base_analysis.get("why_misleading")
    if not why_misleading and website_score < 40:
        why_misleading = (
            "The publishing source itself has weak credibility signals, so the claim should not be trusted without stronger supporting evidence."
        )
    elif not why_misleading and not sources:
        why_misleading = (
            "The claim could not be strongly supported by the configured trusted source APIs, so the result stays cautious."
        )

    bias_analysis = (
        f"Claim-content assessment: {base_analysis.get('bias_analysis', 'No major framing signal detected.')} "
        f"Source assessment: {domain_info['summary']}"
    )

    return {
        "verdict": verdict,
        "trust_score": max(0, min(100, trust_score)),
        "confidence": max(0, min(100, confidence)),
        "explanation": " ".join(explanation_parts),
        "why_misleading": why_misleading,
        "bias_analysis": bias_analysis,
        "domain": domain,
        "domain_reliability": domain_info["reliability"],
        "domain_summary": domain_info["summary"],
    }


async def get_sources(claim: str, count: int = 3) -> List[Source]:
    """Get real sources from configured trusted APIs for the claim."""
    result = await search_all_sources(claim, limit_per_source=count)
    sources = []

    if result["found"]:
        for article in result["articles"][: count * 2]:
            reliability = (
                SourceReliability.HIGH
                if article.get("provider_reliability") == "high"
                else SourceReliability.MEDIUM
            )
            publisher = article.get("source_name", "Unknown")

            sources.append(Source(
                id=str(uuid.uuid4()),
                title=article["title"],
                publisher=publisher,
                summary=article.get("extract", "")[:200] + "..." if len(article.get("extract", "")) > 200 else article.get("extract", ""),
                url=article.get("url", ""),
                reliability=reliability,
            ))

            if len(sources) >= count:
                break

    return sources


def build_primary_source(
    claim: str,
    source_url: Optional[str],
    publisher: Optional[str],
    author: Optional[str],
    domain: Optional[str],
    reliability: SourceReliability,
    summary: str,
) -> Optional[Source]:
    """Represent the submitted article/source as a source card."""
    if not source_url and not publisher and not author and not domain:
        return None

    display_title = publisher or domain or "Submitted website"
    detail_parts = [summary]

    if author and author.strip():
        detail_parts.append(f"Author: {author.strip()}.")

    if domain:
        detail_parts.append(f"Domain: {domain}.")

    return Source(
        id=str(uuid.uuid4()),
        title=f"Submitted source: {display_title}",
        publisher=publisher or domain or "Submitted source",
        summary=" ".join(detail_parts),
        url=source_url or "",
        reliability=reliability,
    )


@app.get("/")
def root():
    return {"message": "CredCheck API", "docs": "/docs", "version": "1.0.0"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0", "timestamp": datetime.now(timezone.utc)}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_claim(request: AnalysisRequest):
    """Analyze a claim and return credibility results."""
    analysis_id = str(uuid.uuid4())
    article_metadata = None

    if not request.claim and not request.source_url:
        raise HTTPException(
            status_code=422,
            detail="Provide either a claim or a source_url.",
        )

    if request.source_url:
        article_metadata = await fetch_article_metadata(request.source_url)

    effective_claim = (request.claim or "").strip()
    if not effective_claim and article_metadata and article_metadata.get("title"):
        effective_claim = article_metadata["title"]

    if not effective_claim:
        raise HTTPException(
            status_code=422,
            detail="Could not extract a claim from the provided URL. Add a manual claim or use a page with a readable headline.",
        )

    effective_publisher = (
        (request.publisher or "").strip()
        or (article_metadata.get("publisher", "").strip() if article_metadata else "")
    )
    effective_author = (
        (request.author or "").strip()
        or (article_metadata.get("author", "").strip() if article_metadata else "")
    )
    effective_source_url = (
        (article_metadata.get("url") if article_metadata else None)
        or request.source_url
    )

    # Get analysis based on claim content
    base_analysis = analyze_claim_content(effective_claim)

    # Get real sources from configured trusted source APIs
    sources = await get_sources(effective_claim)
    analysis = combine_analysis(
        claim=effective_claim,
        base_analysis=base_analysis,
        sources=sources,
        source_url=effective_source_url,
        publisher=effective_publisher,
        author=effective_author,
    )
    primary_source = build_primary_source(
        claim=effective_claim,
        source_url=effective_source_url,
        publisher=effective_publisher,
        author=effective_author,
        domain=analysis.get("domain"),
        reliability=analysis.get("domain_reliability", SourceReliability.MEDIUM),
        summary=(
            ((article_metadata or {}).get("description") or "").strip()
            or analysis.get("domain_summary", "")
        ),
    )
    combined_sources = ([primary_source] if primary_source else []) + sources

    # Create result
    result = AnalysisResult(
        id=analysis_id,
        claim=effective_claim,
        verdict=analysis["verdict"],
        trust_score=analysis["trust_score"],
        confidence=analysis["confidence"],
        explanation=analysis["explanation"],
        why_misleading=analysis.get("why_misleading"),
        bias_analysis=analysis.get("bias_analysis"),
        core_claim=effective_claim[:200],
        sources=combined_sources,
        timestamp=datetime.now(timezone.utc),
    )

    # Store in history
    _history.append(result)

    return AnalysisResponse(success=True, data=result)


@app.get("/api/history")
async def get_history(limit: int = 10):
    """Get recent analysis history."""
    sorted_history = sorted(_history, key=lambda x: x.timestamp, reverse=True)
    return {
        "success": True,
        "data": [
            HistoryItem(
                id=r.id,
                claim=r.claim[:100] + "..." if len(r.claim) > 100 else r.claim,
                verdict=r.verdict,
                trust_score=r.trust_score,
                timestamp=r.timestamp,
            )
            for r in sorted_history[:limit]
        ]
    }


@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get a specific analysis by ID."""
    for result in _history:
        if result.id == analysis_id:
            return AnalysisResponse(success=True, data=result)
    return {"success": False, "error": "Analysis not found"}


@app.get("/api/verify-sources")
async def verify_sources(q: str = Query(..., min_length=3, description="Claim or topic to verify")):
    """Verify sources for a claim using configured trusted source APIs."""
    result = await search_all_sources(q, limit_per_source=5)

    if not result["found"]:
        return {"success": True, "data": {"verified": False, "sources": [], "message": "No sources found"}}

    sources = []
    for article in result["articles"]:
        source_name = article.get("source_name", "Unknown")
        reliability = (
            SourceReliability.HIGH
            if article.get("provider_reliability") == "high"
            else SourceReliability.MEDIUM
        )

        sources.append(Source(
            id=str(uuid.uuid4()),
            title=article["title"],
            publisher=source_name,
            summary=article.get("extract", "")[:300] if article.get("extract") else "",
            url=article.get("url", ""),
            reliability=reliability,
        ))

    return {
        "success": True,
        "data": {
            "verified": True,
            "sources": sources,
            "sources_checked": result.get("sources_checked", []),
            "source_count": len(sources),
        }
    }


@app.post("/api/verify-claim")
async def verify_claim(request: AnalysisRequest):
    """Verify a claim against configured trusted source APIs and return facts."""
    if not request.claim or not request.claim.strip():
        raise HTTPException(status_code=422, detail="A claim is required for verification.")

    normalized_claim = request.claim.strip()
    keywords = [w for w in normalized_claim.split() if len(w) > 4][:5]
    verification = await verify_claim_with_sources(normalized_claim)

    return {
        "success": True,
        "data": {
            "claim": normalized_claim,
            "keywords_searched": keywords,
            "verification": verification,
            "facts_found": len(verification.get("facts", [])),
        }
    }


# ============================================
# SITE CREDIBILITY DATABASE
# ============================================
SITE_CREDIBILITY_DB = {
    "cnn.com": {
        "credibilityScore": 72, "credibilityVerdict": "Generally Reliable",
        "editorialBias": "Left", "ownership": "Warner Bros. Discovery",
        "funding": "Advertising, subscriptions", "transparencyScore": 78,
        "factCheckTrackRecord": "Low rate of retractions",
        "knownFor": ["Breaking news coverage", "Extensive global reporting", "Political news"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Straight news reporting, no partisan lean"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Non-partisan wire service"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Independent public media"},
        ],
    },
    "foxnews.com": {
        "credibilityScore": 58, "credibilityVerdict": "Mixed",
        "editorialBias": "Right", "ownership": "Fox Corporation",
        "funding": "Advertising, subscriptions", "transparencyScore": 65,
        "factCheckTrackRecord": "High rate of misinformation claims",
        "knownFor": ["Conservative commentary", "Breaking political news", "Entertainment coverage"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Non-partisan newswire"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Independent fact-based reporting"},
            {"name": "The Hill", "url": "https://thehill.com", "reason": "Bipartisan political coverage"},
        ],
    },
    "nytimes.com": {
        "credibilityScore": 84, "credibilityVerdict": "Reliable",
        "editorialBias": "Center-Left", "ownership": "New York Times Company",
        "funding": "Subscriptions, advertising", "transparencyScore": 88,
        "factCheckTrackRecord": "Low retraction rate, corrections promptly published",
        "knownFor": ["Investigative journalism", "Political coverage", "International affairs"],
        "recommendedAlternatives": [
            {"name": "Wall Street Journal", "url": "https://wsj.com", "reason": "Business-focused, broad coverage"},
            {"name": "Washington Post", "url": "https://washingtonpost.com", "reason": "Strong investigative team"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Global wire service, balanced"},
        ],
    },
    "washingtonpost.com": {
        "credibilityScore": 82, "credibilityVerdict": "Reliable",
        "editorialBias": "Center-Left", "ownership": "Nash Holdings (Jeff Bezos)",
        "funding": "Subscriptions, advertising", "transparencyScore": 85,
        "factCheckTrackRecord": "Reliable, occasional corrections",
        "knownFor": ["Watergate investigation", "National security reporting", "Political journalism"],
        "recommendedAlternatives": [
            {"name": "New York Times", "url": "https://nytimes.com", "reason": "Similar caliber journalism"},
            {"name": "Wall Street Journal", "url": "https://wsj.com", "reason": "Broad national coverage"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Fact-focused wire service"},
        ],
    },
    "reuters.com": {
        "credibilityScore": 92, "credibilityVerdict": "Reliable",
        "editorialBias": "Center", "ownership": "Thomson Reuters",
        "funding": "Corporate, subscriptions", "transparencyScore": 94,
        "factCheckTrackRecord": "Very low error rate, fast corrections",
        "knownFor": ["Wire service journalism", "Financial markets coverage", "International news"],
        "recommendedAlternatives": [
            {"name": "AP News", "url": "https://apnews.com", "reason": "Another trusted wire service"},
            {"name": "Bloomberg", "url": "https://bloomberg.com", "reason": "Financial news authority"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Non-profit public media"},
        ],
    },
    "apnews.com": {
        "credibilityScore": 93, "credibilityVerdict": "Reliable",
        "editorialBias": "Center", "ownership": "Associated Press",
        "funding": "News service subscriptions", "transparencyScore": 95,
        "factCheckTrackRecord": "Extremely low error rate",
        "knownFor": ["Wire service journalism", "Breaking news", "Sports coverage"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Similar wire service model"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Non-profit journalism"},
            {"name": "BBC", "url": "https://bbc.com", "reason": "International perspective"},
        ],
    },
    "bbc.com": {
        "credibilityScore": 86, "credibilityVerdict": "Reliable",
        "editorialBias": "Center", "ownership": "BBC Trust / Public funding",
        "funding": "License fee, commercial", "transparencyScore": 90,
        "factCheckTrackRecord": "Low error rate, corrections noted",
        "knownFor": ["International coverage", "BBC News journalism", "Documentaries"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Global news wire"},
            {"name": "The Guardian", "url": "https://theguardian.com", "reason": "UK perspective, strong journalism"},
            {"name": "NPR", "url": "https://npr.org", "reason": "US public media"},
        ],
    },
    "britannica.com": {
        "credibilityScore": 95, "credibilityVerdict": "Highly Reliable",
        "editorialBias": "Center", "ownership": "Encyclopaedia Britannica, Inc.",
        "funding": "Subscriptions, educational licensing", "transparencyScore": 94,
        "factCheckTrackRecord": "Strong editorial review and reference-quality coverage",
        "knownFor": ["Encyclopedia entries", "Reference research", "Editorially reviewed summaries"],
        "recommendedAlternatives": [
            {"name": "Britannica", "url": "https://britannica.com", "reason": "Reference encyclopedia"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Current events verification"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Fact-based reporting"},
        ],
    },
    "theguardian.com": {
        "credibilityScore": 78, "credibilityVerdict": "Generally Reliable",
        "editorialBias": "Left", "ownership": "Guardian Media Group",
        "funding": "Subscriptions, advertising", "transparencyScore": 82,
        "factCheckTrackRecord": "Generally reliable, some opinion vs news confusion",
        "knownFor": ["UK and European coverage", "Investigative reporting", "Climate change coverage"],
        "recommendedAlternatives": [
            {"name": "BBC", "url": "https://bbc.com", "reason": "Balanced UK coverage"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Neutral wire service"},
            {"name": "Financial Times", "url": "https://ft.com", "reason": "Business and global news"},
        ],
    },
    "npr.org": {
        "credibilityScore": 87, "credibilityVerdict": "Reliable",
        "editorialBias": "Center-Left", "ownership": "National Public Radio",
        "funding": "Grants, memberships, sponsors", "transparencyScore": 91,
        "factCheckTrackRecord": "Very low error rate, corrections prominent",
        "knownFor": ["Public radio journalism", "Cultural coverage", "Domestic news"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Balanced wire service"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Non-partisan newswire"},
            {"name": "PBS", "url": "https://pbs.org", "reason": "Non-profit broadcast"},
        ],
    },
    "wsj.com": {
        "credibilityScore": 84, "credibilityVerdict": "Reliable",
        "editorialBias": "Center-Right", "ownership": "News Corp (Rupert Murdoch)",
        "funding": "Subscriptions, advertising", "transparencyScore": 83,
        "factCheckTrackRecord": "Generally reliable, opinion pages separate",
        "knownFor": ["Business journalism", "Financial markets", "Investigative reporting"],
        "recommendedAlternatives": [
            {"name": "New York Times", "url": "https://nytimes.com", "reason": "Broad national coverage"},
            {"name": "Financial Times", "url": "https://ft.com", "reason": "Global business focus"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Financial news wire"},
        ],
    },
    "nbcnews.com": {
        "credibilityScore": 80, "credibilityVerdict": "Reliable",
        "editorialBias": "Center-Left", "ownership": "NBCUniversal (Comcast)",
        "funding": "Advertising, subscriptions", "transparencyScore": 79,
        "factCheckTrackRecord": "Low retraction rate",
        "knownFor": ["Broadcast journalism", "Political coverage", "Business news"],
        "recommendedAlternatives": [
            {"name": "CBS News", "url": "https://cbsnews.com", "reason": "Established broadcast news"},
            {"name": "ABC News", "url": "https://abcnews.com", "reason": "Major broadcast network"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Wire service balance"},
        ],
    },
    "cbsnews.com": {
        "credibilityScore": 81, "credibilityVerdict": "Reliable",
        "editorialBias": "Center", "ownership": "Paramount Global",
        "funding": "Advertising, subscriptions", "transparencyScore": 80,
        "factCheckTrackRecord": "Low error rate, corrections policy",
        "knownFor": ["Broadcast journalism", "Political coverage", "Investigative unit"],
        "recommendedAlternatives": [
            {"name": "NBC News", "url": "https://nbcnews.com", "reason": "Comparable broadcast news"},
            {"name": "ABC News", "url": "https://abcnews.com", "reason": "Major network news"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Wire service reliability"},
        ],
    },
    "breitbart.com": {
        "credibilityScore": 22, "credibilityVerdict": "Unreliable",
        "editorialBias": "Far Right", "ownership": "Breitbart News",
        "funding": "Advertising", "transparencyScore": 35,
        "factCheckTrackRecord": "High rate of false claims documented",
        "knownFor": ["Conservative commentary", "Immigration coverage", "Political news"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Non-partisan reporting"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Fact-based wire service"},
            {"name": "The Hill", "url": "https://thehill.com", "reason": "Bipartisan political coverage"},
        ],
    },
    "infowars.com": {
        "credibilityScore": 8, "credibilityVerdict": "Unreliable",
        "editorialBias": "Far Right", "ownership": "Free Speech Systems",
        "funding": "Product sales, donations", "transparencyScore": 12,
        "factCheckTrackRecord": "Frequently debunked by fact-checkers",
        "knownFor": ["Conspiracy theories", "Misinformation", "Health product sales"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Fact-based journalism"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Non-profit public media"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Trusted newswire"},
        ],
    },
    "theonion.com": {
        "credibilityScore": 8, "credibilityVerdict": "Satire/Parody",
        "editorialBias": "Center", "ownership": "Global Media",
        "funding": "Advertising", "transparencyScore": 60,
        "factCheckTrackRecord": "Intentional satire, not factual",
        "knownFor": ["Satirical news parody", "Humor", "Entertainment"],
        "recommendedAlternatives": [
            {"name": "Clickhole", "url": "https://clickhole.com", "reason": "Similar satirical format"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "For actual news"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Real journalism"},
        ],
    },
    "buzzfeed.com": {
        "credibilityScore": 55, "credibilityVerdict": "Mixed",
        "editorialBias": "Left", "ownership": "BuzzFeed Inc.",
        "funding": "Advertising, partnerships", "transparencyScore": 62,
        "factCheckTrackRecord": "Mix of news and entertainment, some retractions",
        "knownFor": ["Listicles", "Viral content", "Investigative reporting (BuzzFeed News)"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Fact-based news"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Public media journalism"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Wire service reliability"},
        ],
    },
    "huffpost.com": {
        "credibilityScore": 62, "credibilityVerdict": "Mixed",
        "editorialBias": "Left", "ownership": "BuzzFeed Inc.",
        "funding": "Advertising", "transparencyScore": 68,
        "factCheckTrackRecord": "Opinion-heavy, occasional fact issues",
        "knownFor": ["Political commentary", "Breaking news", "Opinion pieces"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Neutral reporting"},
            {"name": "The Guardian", "url": "https://theguardian.com", "reason": "Progressive but fact-checked"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Non-profit balanced coverage"},
        ],
    },
    "nypost.com": {
        "credibilityScore": 52, "credibilityVerdict": "Mixed",
        "editorialBias": "Right", "ownership": "News Corp",
        "funding": "Subscriptions, advertising", "transparencyScore": 55,
        "factCheckTrackRecord": "Some sensationalism and retractions",
        "knownFor": ["New York crime coverage", "Tabloid journalism", "Business news"],
        "recommendedAlternatives": [
            {"name": "New York Times", "url": "https://nytimes.com", "reason": "In-depth NYC coverage"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Balanced news"},
            {"name": "Wall Street Journal", "url": "https://wsj.com", "reason": "Business journalism"},
        ],
    },
    "dailymail.co.uk": {
        "credibilityScore": 42, "credibilityVerdict": "Mixed",
        "editorialBias": "Right", "ownership": "DMGT (Lord Rothermere)",
        "funding": "Advertising", "transparencyScore": 40,
        "factCheckTrackRecord": "Known for sensationalism and errors",
        "knownFor": ["British celebrity news", "Scandal coverage", "UK news"],
        "recommendedAlternatives": [
            {"name": "BBC", "url": "https://bbc.com", "reason": "Trusted UK coverage"},
            {"name": "The Guardian", "url": "https://theguardian.com", "reason": "Quality British press"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Wire service neutrality"},
        ],
    },
    "theepochtimes.com": {
        "credibilityScore": 25, "credibilityVerdict": "Unreliable",
        "editorialBias": "Far Right", "ownership": "Epoch Media Group",
        "funding": "Subscriptions, donations", "transparencyScore": 30,
        "factCheckTrackRecord": "Multiple fact-checks and corrections",
        "knownFor": ["Anti-China coverage", "Conservative commentary", " election claims"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Balanced international coverage"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Fact-based reporting"},
            {"name": "BBC", "url": "https://bbc.com", "reason": "Global perspective"},
        ],
    },
    "naturalnews.com": {
        "credibilityScore": 10, "credibilityVerdict": "Unreliable",
        "editorialBias": "Far Right", "ownership": "Mike Adams (self-published)",
        "funding": "Product sales, ads", "transparencyScore": 8,
        "factCheckTrackRecord": "Consistently flagged for misinformation",
        "knownFor": ["Anti-vaccine content", "Health misinformation", "Conspiracy theories"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Fact-based health coverage"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Science-based reporting"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Reliable news service"},
        ],
    },
    "thefederalist.com": {
        "credibilityScore": 48, "credibilityVerdict": "Mixed",
        "editorialBias": "Right", "ownership": "The Federalist (Lachlan Markay)",
        "funding": "Donations, advertising", "transparencyScore": 45,
        "factCheckTrackRecord": "Opinion site, some disputed claims",
        "knownFor": ["Conservative commentary", "Political opinion", "Cultural criticism"],
        "recommendedAlternatives": [
            {"name": "The Hill", "url": "https://thehill.com", "reason": "Bipartisan political news"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Neutral news reporting"},
            {"name": "Wall Street Journal", "url": "https://wsj.com", "reason": "Business and politics"},
        ],
    },
    "motherjones.com": {
        "credibilityScore": 70, "credibilityVerdict": "Generally Reliable",
        "editorialBias": "Left", "ownership": "Mother Jones Foundation",
        "funding": "Non-profit, subscriptions", "transparencyScore": 78,
        "factCheckTrackRecord": "Reliable, investigative focus",
        "knownFor": ["Investigative journalism", "Environmental coverage", "Political reporting"],
        "recommendedAlternatives": [
            {"name": "The Guardian", "url": "https://theguardian.com", "reason": "Progressive investigative"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Non-profit balanced"},
            {"name": "ProPublica", "url": "https://propublica.org", "reason": "Non-profit investigative"},
        ],
    },
    "reason.com": {
        "credibilityScore": 74, "credibilityVerdict": "Generally Reliable",
        "editorialBias": "Center", "ownership": "Reason Foundation",
        "funding": "Subscriptions, donations", "transparencyScore": 80,
        "factCheckTrackRecord": "Libertarian perspective, fact-checked reporting",
        "knownFor": ["Libertarian commentary", "Criminal justice reform", "Economic policy"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Neutral newswire"},
            {"name": "The Hill", "url": "https://thehill.com", "reason": "Bipartisan coverage"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Public media"},
        ],
    },
    "bipartisanpolicy.org": {
        "credibilityScore": 82, "credibilityVerdict": "Reliable",
        "editorialBias": "Center", "ownership": "Bipartisan Policy Center",
        "funding": "Grants, foundations", "transparencyScore": 90,
        "factCheckTrackRecord": "Policy-focused, fact-based analysis",
        "knownFor": ["Congressional coverage", "Policy analysis", "Bipartisan reporting"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Straight reporting"},
            {"name": "Pew Research", "url": "https://pewresearch.org", "reason": "Nonpartisan polling"},
            {"name": "Brookings Institution", "url": "https://brookings.edu", "reason": "Policy research"},
        ],
    },
    "snopes.com": {
        "credibilityScore": 88, "credibilityVerdict": "Reliable",
        "editorialBias": "Center", "ownership": "Snopes Media Group",
        "funding": "Advertising, subscriptions", "transparencyScore": 92,
        "factCheckTrackRecord": "Established fact-checker, low error rate",
        "knownFor": ["Fact-checking viral claims", "Misinformation debunking", "Urban legend research"],
        "recommendedAlternatives": [
            {"name": "PolitiFact", "url": "https://politifact.com", "reason": "Established fact-checker"},
            {"name": "FactCheck.org", "url": "https://factcheck.org", "reason": "Nonpartisan fact-checking"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Breaking news verification"},
        ],
    },
    "politifact.com": {
        "credibilityScore": 90, "credibilityVerdict": "Reliable",
        "editorialBias": "Center", "ownership": "Poynter Institute",
        "funding": "Non-profit, grants", "transparencyScore": 93,
        "factCheckTrackRecord": "Gold standard political fact-checking",
        "knownFor": ["Political claim verification", "Truth-O-Meter", "PolitiFact ratings"],
        "recommendedAlternatives": [
            {"name": "Snopes", "url": "https://snopes.com", "reason": "Long-running fact-checker"},
            {"name": "FactCheck.org", "url": "https://factcheck.org", "reason": "Nonpartisan monitoring"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Fact-based wire service"},
        ],
    },
    "factcheck.org": {
        "credibilityScore": 89, "credibilityVerdict": "Reliable",
        "editorialBias": "Center", "ownership": "Annenberg Public Policy Center",
        "funding": "Grants, educational", "transparencyScore": 91,
        "factCheckTrackRecord": "Established nonpartisan fact-checker",
        "knownFor": ["Political fact-checking", "Viral claim verification", "Policy analysis"],
        "recommendedAlternatives": [
            {"name": "PolitiFact", "url": "https://politifact.com", "reason": "Political fact-checks"},
            {"name": "Snopes", "url": "https://snopes.com", "reason": "Viral misinformation"},
            {"name": "Reuters", "url": "https://reuters.com", "reason": "News verification"},
        ],
    },
}


def get_site_credibility(domain: str) -> dict:
    """Look up a domain in the credibility database or return a low-confidence default."""
    if not domain:
        return _make_unknown_site_response(domain, "No domain provided")

    # Clean domain
    clean = domain.lower().strip()
    if clean.startswith("www."):
        clean = clean[4:]

    # Match the longest known suffix so domains like bbc.co.uk or edition.cnn.com work better.
    for known_domain in sorted(SITE_CREDIBILITY_DB.keys(), key=len, reverse=True):
        if clean == known_domain or clean.endswith(f".{known_domain}"):
            data = SITE_CREDIBILITY_DB[known_domain]
            return {
                "domain": clean,
                **data,
            }

    # Unknown site - return low-confidence default
    return _make_unknown_site_response(clean)


def _make_unknown_site_response(domain: str, reason: str) -> dict:
    return {
        "domain": domain,
        "credibilityScore": 50,
        "credibilityVerdict": "Mixed",
        "editorialBias": "Unknown",
        "ownership": "Unknown",
        "funding": "Unknown",
        "transparencyScore": 30,
        "factCheckTrackRecord": f"Not a recognized major news outlet: {reason}",
        "knownFor": ["Unknown publisher", "Not a known news organization"],
        "recommendedAlternatives": [
            {"name": "Reuters", "url": "https://reuters.com", "reason": "Trusted global newswire"},
            {"name": "AP News", "url": "https://apnews.com", "reason": "Reliable fact-based reporting"},
            {"name": "NPR", "url": "https://npr.org", "reason": "Non-profit public media"},
        ],
    }


async def call_openai_json(prompt: str, schema_name: str, schema: dict) -> Optional[dict]:
    """Call the OpenAI Responses API for structured JSON output."""
    if not OPENAI_API_KEY:
        return None

    payload = {
        "model": OPENAI_MODEL,
        "input": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "You are a careful fact-checking assistant. "
                            "Return only valid JSON matching the schema."
                        ),
                    }
                ],
            },
            {
                "role": "user",
                "content": [{"type": "input_text", "text": prompt}],
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "strict": True,
                "schema": schema,
            }
        },
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError):
        return None

    output_text = data.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        try:
            return json.loads(output_text)
        except ValueError:
            pass

    for item in data.get("output", []):
        for content in item.get("content", []):
            text_value = content.get("text")
            if isinstance(text_value, str) and text_value.strip():
                try:
                    return json.loads(text_value)
                except ValueError:
                    continue

    return None


async def ai_detect_claims(text: str) -> Optional[list[dict]]:
    """Use AI to extract concise checkable claims from page text."""
    prompt = (
        "Extract up to 5 concise, verifiable factual claims from the following web page text. "
        "Only include claims that could realistically be fact-checked. "
        "Ignore calls to action, navigation, and boilerplate.\n\n"
        f"PAGE TEXT:\n{text[:12000]}"
    )
    schema = {
        "type": "object",
        "properties": {
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "claim": {"type": "string"},
                    },
                    "required": ["claim"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["claims"],
        "additionalProperties": False,
    }
    result = await call_openai_json(prompt, "detected_claims", schema)
    if not result or not isinstance(result.get("claims"), list):
        return None

    cleaned_claims = []
    for item in result["claims"][:5]:
        claim = (item.get("claim") or "").strip()
        if 20 <= len(claim) <= 320:
            cleaned_claims.append({"claim": claim})
    return cleaned_claims or None


async def ai_site_credibility(
    domain: str,
    source_url: Optional[str],
    page_title: Optional[str],
    description: Optional[str],
    page_text: Optional[str],
    fallback: dict,
) -> Optional[dict]:
    """Use AI to assess website credibility from URL/page context."""
    prompt = (
        "Assess the credibility of this website/article source. "
        "Use the page title, description, URL, article text excerpt, and the fallback baseline. "
        "Return a conservative judgment. If evidence is weak, stay near the fallback. "
        "Keep recommended alternatives short.\n\n"
        f"DOMAIN: {domain}\n"
        f"URL: {source_url or ''}\n"
        f"TITLE: {page_title or ''}\n"
        f"DESCRIPTION: {description or ''}\n"
        f"PAGE EXCERPT: {(page_text or '')[:4000]}\n"
        f"FALLBACK BASELINE: {json.dumps(fallback)}"
    )
    schema = {
        "type": "object",
        "properties": {
            "credibilityScore": {"type": "integer"},
            "credibilityVerdict": {"type": "string"},
            "editorialBias": {"type": "string"},
            "ownership": {"type": "string"},
            "funding": {"type": "string"},
            "transparencyScore": {"type": "integer"},
            "factCheckTrackRecord": {"type": "string"},
            "knownFor": {"type": "array", "items": {"type": "string"}},
            "recommendedAlternatives": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "url": {"type": "string"},
                        "reason": {"type": "string"},
                    },
                    "required": ["name", "url", "reason"],
                    "additionalProperties": False,
                },
            },
        },
        "required": [
            "credibilityScore",
            "credibilityVerdict",
            "editorialBias",
            "ownership",
            "funding",
            "transparencyScore",
            "factCheckTrackRecord",
            "knownFor",
            "recommendedAlternatives",
        ],
        "additionalProperties": False,
    }
    result = await call_openai_json(prompt, "site_credibility", schema)
    if not result:
        return None

    try:
        return {
            "domain": domain,
            "credibilityScore": max(0, min(100, int(result["credibilityScore"]))),
            "credibilityVerdict": str(result["credibilityVerdict"]).strip() or fallback["credibilityVerdict"],
            "editorialBias": str(result["editorialBias"]).strip() or fallback["editorialBias"],
            "ownership": str(result["ownership"]).strip() or fallback["ownership"],
            "funding": str(result["funding"]).strip() or fallback["funding"],
            "transparencyScore": max(0, min(100, int(result["transparencyScore"]))),
            "factCheckTrackRecord": str(result["factCheckTrackRecord"]).strip() or fallback["factCheckTrackRecord"],
            "knownFor": [str(item).strip() for item in result["knownFor"][:5] if str(item).strip()],
            "recommendedAlternatives": result["recommendedAlternatives"][:3],
        }
    except (KeyError, TypeError, ValueError):
        return None


# ============================================
# NEW ENDPOINTS
# ============================================

class SiteCredibilityRequest(BaseModel):
    domain: Optional[str] = None
    source_url: Optional[str] = None
    page_title: Optional[str] = None
    page_description: Optional[str] = None
    page_text: Optional[str] = None


class SiteCredibilityResponse(BaseModel):
    domain: str
    checkedUrl: Optional[str] = None
    pageTitle: Optional[str] = None
    credibilityScore: int
    credibilityVerdict: str
    editorialBias: str
    ownership: str
    funding: str
    transparencyScore: int
    factCheckTrackRecord: str
    knownFor: List[str]
    recommendedAlternatives: List[dict]


@app.post("/site-credibility", response_model=SiteCredibilityResponse)
async def site_credibility_endpoint(request: SiteCredibilityRequest):
    """Assess the credibility of a news website/domain using media bias research."""
    domain = request.domain
    if request.source_url:
        domain = extract_domain(request.source_url, request.source_url) or domain

    result = get_site_credibility(domain or "")

    checked_url = request.source_url
    page_title = request.page_title
    page_description = request.page_description
    page_text = request.page_text
    if request.source_url:
        metadata = await fetch_article_metadata(request.source_url)
        checked_url = metadata.get("url") or request.source_url
        page_title = page_title or metadata.get("title") or None
        page_description = page_description or metadata.get("description") or None

    ai_result = await ai_site_credibility(
        domain=result["domain"],
        source_url=checked_url,
        page_title=page_title,
        description=page_description,
        page_text=page_text,
        fallback=result,
    )
    final_result = ai_result or result

    return {
        **final_result,
        "checkedUrl": checked_url,
        "pageTitle": page_title,
    }


@app.post("/api/detect-claims")
async def detect_claims(request: dict):
    """Detect verifiable claims in a block of text."""
    text = request.get("text", "")

    if not text or len(text.strip()) < 50:
        return {"success": True, "data": {"claims": [], "message": "Text too short"}}

    ai_claims = await ai_detect_claims(text)
    if ai_claims:
        return {"success": True, "data": {"claims": ai_claims, "method": "ai"}}

    normalized_text = re.sub(r"\s+", " ", text).strip()
    raw_segments = re.split(r"(?<=[.!?])\s+|\n+", normalized_text)
    candidates = []

    for segment in raw_segments:
        sent = segment.strip(" -\t\r\n")
        lowered = sent.lower()

        if len(sent) < 25 or len(sent) > 320:
            continue
        if sent.endswith("?"):
            continue
        if any(
            lowered.startswith(x)
            for x in [
                "click here", "sign up", "subscribe", "follow us", "visit",
                "call", "share this", "advertisement", "cookie", "privacy policy",
            ]
        ):
            continue

        score = 0
        if re.search(r"\b\d+(\.\d+)?%?\b", sent):
            score += 2
        if any(
            token in lowered
            for token in [
                "according to", "reported", "reports", "claimed", "claims",
                "study", "research", "experts", "announced", "confirmed",
                "found", "shows", "data", "evidence", "officials",
            ]
        ):
            score += 2
        if any(verb in lowered for verb in [" is ", " are ", " was ", " were ", " has ", " have ", " will "]):
            score += 1
        if 30 <= len(sent) <= 180:
            score += 1
        if sent.count(",") >= 1:
            score += 1

        if score >= 2:
            candidates.append({"claim": sent, "score": score})

    if not candidates:
        fallback_segments = [
            {"claim": seg.strip(" -\t\r\n"), "score": 1}
            for seg in raw_segments
            if 30 <= len(seg.strip()) <= 180 and not seg.strip().endswith("?")
        ]
        candidates = fallback_segments[:5]

    # Deduplicate
    seen = set()
    unique_claims = []
    for c in sorted(candidates, key=lambda item: (-item["score"], len(item["claim"]))):
        norm = c["claim"].lower()[:50]
        if norm not in seen:
            seen.add(norm)
            unique_claims.append({"claim": c["claim"]})

    return {"success": True, "data": {"claims": unique_claims[:10]}}


@app.post("/api/counter-narrative")
async def counter_narrative(request: dict):
    """Generate a counter-narrative for a false or misleading claim."""
    claim = request.get("claim", "")
    verdict = request.get("verdict", "")
    explanation = request.get("explanation", "")

    narratives = {
        "false": f"The claim that {claim[:100]} has been debunked by reliable sources. {explanation[:200]}",
        "misleading": f"While containing elements of truth, the claim about {claim[:80]} requires important context. {explanation[:200]} Consider checking multiple authoritative sources for the full picture.",
    }

    narrative = narratives.get(verdict, "This claim should be verified with multiple reliable sources before sharing.")

    return {
        "success": True,
        "data": {
            "counter_narrative": narrative,
            "original_claim": claim,
            "verdict": verdict,
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
