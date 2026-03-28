"""CredCheck Backend API.

FastAPI-based fact-checking service with benchmark sources and
basic website/domain credibility signals.
"""

import hashlib
import json
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.source_service import (
    fetch_article_metadata,
    search_all_sources,
    verify_claim_with_sources,
)

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


class AuthRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    success: bool
    message: str


# SQLite-backed persistent history storage
DB_PATH = os.path.join(os.path.dirname(__file__), "data.db")

conn = sqlite3.connect(DB_PATH, check_same_thread=False, detect_types=sqlite3.PARSE_DECLTYPES)
conn.row_factory = sqlite3.Row

def initialize_db():
    with conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                claim TEXT NOT NULL,
                verdict TEXT NOT NULL,
                trust_score INTEGER NOT NULL,
                confidence INTEGER NOT NULL,
                explanation TEXT NOT NULL,
                why_misleading TEXT,
                bias_analysis TEXT,
                core_claim TEXT NOT NULL,
                sources TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

initialize_db()

HIGH_CREDIBILITY_DOMAINS = {
    "apnews.com": 88,
    "bbc.com": 86,
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


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def get_user(username: str):
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    return row


def create_user(username: str, password: str):
    if get_user(username):
        raise ValueError("Username already exists")

    password_hash = hash_password(password)
    with conn:
        conn.execute(
            "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
            (username, password_hash, datetime.now(timezone.utc).isoformat()),
        )


def dict_to_analysis_result(row: sqlite3.Row) -> AnalysisResult:
    sources = json.loads(row["sources"])
    source_objs = [Source(**source) for source in sources]
    return AnalysisResult(
        id=row["id"],
        claim=row["claim"],
        verdict=Verdict(row["verdict"]),
        trust_score=row["trust_score"],
        confidence=row["confidence"],
        explanation=row["explanation"],
        why_misleading=row["why_misleading"],
        bias_analysis=row["bias_analysis"],
        core_claim=row["core_claim"],
        sources=source_objs,
        timestamp=datetime.fromisoformat(row["timestamp"]),
    )

def save_analysis_result(result: AnalysisResult):
    with conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO history
            (id, claim, verdict, trust_score, confidence, explanation, why_misleading, bias_analysis, core_claim, sources, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result.id,
                result.claim,
                result.verdict.value,
                result.trust_score,
                result.confidence,
                result.explanation,
                result.why_misleading,
                result.bias_analysis,
                result.core_claim,
                json.dumps([source.dict() for source in result.sources]),
                result.timestamp.isoformat(),
            ),
        )


def fetch_history(limit: int = 10) -> List[HistoryItem]:
    cursor = conn.execute(
        "SELECT * FROM history ORDER BY timestamp DESC LIMIT ?", (limit,)
    )
    rows = cursor.fetchall()
    items = []
    for row in rows:
        result = dict_to_analysis_result(row)
        items.append(
            HistoryItem(
                id=result.id,
                claim=result.claim[:100] + "..." if len(result.claim) > 100 else result.claim,
                verdict=result.verdict,
                trust_score=result.trust_score,
                timestamp=result.timestamp,
            )
        )
    return items


def get_analysis_result(analysis_id: str) -> Optional[AnalysisResult]:
    cursor = conn.execute("SELECT * FROM history WHERE id = ?", (analysis_id,))
    row = cursor.fetchone()
    if not row:
        return None
    return dict_to_analysis_result(row)


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


@app.post("/api/auth/register", response_model=AuthResponse)
async def auth_register(request: AuthRequest):
    username = (request.username or "").strip()
    password = request.password or ""

    if not username or not password:
        raise HTTPException(status_code=422, detail="Username and password are required")

    if get_user(username):
        raise HTTPException(status_code=409, detail="Username already exists")

    create_user(username, password)
    return AuthResponse(success=True, message="User registered successfully")


@app.post("/api/auth/login", response_model=AuthResponse)
async def auth_login(request: AuthRequest):
    username = (request.username or "").strip()
    password = request.password or ""

    if not username or not password:
        raise HTTPException(status_code=422, detail="Username and password are required")

    user = get_user(username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    password_hash = hash_password(password)
    if password_hash != user["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return AuthResponse(success=True, message="Login successful")


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

    # Store in history (persistent SQLite global DB)
    save_analysis_result(result)

    return AnalysisResponse(success=True, data=result)


@app.get("/api/history")
async def get_history(limit: int = 10):
    """Get recent analysis history."""
    return {"success": True, "data": [item.dict() for item in fetch_history(limit)]}


@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get a specific analysis by ID."""
    analysis = get_analysis_result(analysis_id)
    if analysis:
        return AnalysisResponse(success=True, data=analysis)
    raise HTTPException(status_code=404, detail="Analysis not found")


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
