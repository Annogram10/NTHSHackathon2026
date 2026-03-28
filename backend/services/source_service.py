"""External source and fact-check provider helpers."""

from __future__ import annotations

import asyncio
import os
import re
from html import unescape
from typing import Any
from urllib.parse import quote_plus, urlparse

import httpx


DEFAULT_TIMEOUT = 10.0
USER_AGENT = "CredCheck/1.0 (+https://localhost)"


def _clean_text(value: str | None) -> str:
    if not value:
        return ""
    text = unescape(value)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _truncate(value: str, limit: int = 320) -> str:
    if len(value) <= limit:
        return value
    return value[: limit - 3].rstrip() + "..."


def _meta_content(html: str, names: list[str], *, property_attr: bool = False) -> str:
    attr = "property" if property_attr else "name"
    for name in names:
        pattern = (
            rf'<meta[^>]+{attr}=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']+)["\']'
        )
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return _clean_text(match.group(1))

        reverse_pattern = (
            rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+{attr}=["\']{re.escape(name)}["\']'
        )
        match = re.search(reverse_pattern, html, re.IGNORECASE)
        if match:
            return _clean_text(match.group(1))
    return ""


def _extract_title(html: str) -> str:
    og_title = _meta_content(html, ["og:title"], property_attr=True)
    if og_title:
        return og_title

    twitter_title = _meta_content(html, ["twitter:title"])
    if twitter_title:
        return twitter_title

    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if title_match:
        return _clean_text(title_match.group(1))

    return ""


def _extract_domain(url: str | None) -> str:
    if not url:
        return ""
    parsed = urlparse(url if "://" in url else f"https://{url}")
    domain = parsed.netloc.lower().strip()
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def _provider_result(
    *,
    title: str,
    summary: str,
    url: str,
    source_name: str,
    published_at: str | None = None,
    provider_reliability: str = "medium",
) -> dict[str, Any]:
    return {
        "title": _clean_text(title),
        "extract": _truncate(_clean_text(summary)),
        "url": url or "",
        "source_name": source_name,
        "published_at": published_at,
        "provider_reliability": provider_reliability,
    }


async def fetch_article_metadata(url: str) -> dict[str, str]:
    """Fetch article metadata directly from a submitted URL."""
    headers = {"User-Agent": USER_AGENT}
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
    except httpx.HTTPError:
        return {"url": url, "title": "", "publisher": "", "author": "", "description": ""}

    html = response.text
    publisher = (
        _meta_content(html, ["og:site_name"], property_attr=True)
        or _meta_content(html, ["application-name", "publisher", "article:publisher"], property_attr=False)
        or _extract_domain(str(response.url))
    )
    author = _meta_content(html, ["author", "article:author", "parsely-author"])
    description = (
        _meta_content(html, ["description"])
        or _meta_content(html, ["og:description"], property_attr=True)
        or _meta_content(html, ["twitter:description"])
    )

    return {
        "url": str(response.url),
        "title": _extract_title(html),
        "publisher": publisher,
        "author": author,
        "description": description,
    }


async def _request_json(url: str, params: dict[str, Any]) -> dict[str, Any] | None:
    headers = {"User-Agent": USER_AGENT}
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError):
        return None


async def search_newsapi(query: str, limit: int) -> list[dict[str, Any]]:
    api_key = os.getenv("NEWSAPI_API_KEY")
    if not api_key:
        return []

    payload = await _request_json(
        "https://newsapi.org/v2/everything",
        {
            "q": query,
            "pageSize": max(1, min(limit, 10)),
            "language": "en",
            "sortBy": "relevancy",
            "apiKey": api_key,
        },
    )
    if not payload:
        return []

    articles = []
    for article in payload.get("articles", [])[:limit]:
        articles.append(
            _provider_result(
                title=article.get("title", ""),
                summary=article.get("description") or article.get("content") or "",
                url=article.get("url", ""),
                source_name=article.get("source", {}).get("name", "NewsAPI"),
                published_at=article.get("publishedAt"),
                provider_reliability="high",
            )
        )
    return articles


async def search_gnews(query: str, limit: int) -> list[dict[str, Any]]:
    api_key = os.getenv("GNEWS_API_KEY")
    if not api_key:
        return []

    payload = await _request_json(
        "https://gnews.io/api/v4/search",
        {
            "q": query,
            "max": max(1, min(limit, 10)),
            "lang": "en",
            "token": api_key,
        },
    )
    if not payload:
        return []

    results = []
    for article in payload.get("articles", [])[:limit]:
        results.append(
            _provider_result(
                title=article.get("title", ""),
                summary=article.get("description") or article.get("content") or "",
                url=article.get("url", ""),
                source_name=article.get("source", {}).get("name", "GNews"),
                published_at=article.get("publishedAt"),
                provider_reliability="high",
            )
        )
    return results


async def search_guardian(query: str, limit: int) -> list[dict[str, Any]]:
    api_key = os.getenv("GUARDIAN_API_KEY")
    if not api_key:
        return []

    payload = await _request_json(
        "https://content.guardianapis.com/search",
        {
            "q": query,
            "page-size": max(1, min(limit, 10)),
            "api-key": api_key,
            "show-fields": "trailText,headline",
        },
    )
    if not payload:
        return []

    results = []
    for article in payload.get("response", {}).get("results", [])[:limit]:
        fields = article.get("fields", {})
        results.append(
            _provider_result(
                title=fields.get("headline") or article.get("webTitle", ""),
                summary=fields.get("trailText", ""),
                url=article.get("webUrl", ""),
                source_name="The Guardian",
                published_at=article.get("webPublicationDate"),
                provider_reliability="high",
            )
        )
    return results


async def search_google_fact_check(query: str, limit: int) -> list[dict[str, Any]]:
    api_key = os.getenv("GOOGLE_FACT_CHECK_API_KEY")
    if not api_key:
        return []

    payload = await _request_json(
        "https://factchecktools.googleapis.com/v1alpha1/claims:search",
        {
            "query": query,
            "pageSize": max(1, min(limit, 10)),
            "key": api_key,
            "languageCode": "en-US",
        },
    )
    if not payload:
        return []

    results = []
    for claim in payload.get("claims", [])[:limit]:
        reviews = claim.get("claimReview", [])
        review = reviews[0] if reviews else {}
        publisher_name = review.get("publisher", {}).get("name", "Google Fact Check")
        summary = review.get("textualRating") or claim.get("text", "")
        results.append(
            _provider_result(
                title=claim.get("text", "Fact check result"),
                summary=summary,
                url=review.get("url", ""),
                source_name=publisher_name,
                published_at=review.get("reviewDate"),
                provider_reliability="high",
            )
        )
    return results


async def search_mediastack(query: str, limit: int) -> list[dict[str, Any]]:
    api_key = os.getenv("MEDIASTACK_API_KEY")
    if not api_key:
        return []

    payload = await _request_json(
        "http://api.mediastack.com/v1/news",
        {
            "access_key": api_key,
            "keywords": query,
            "languages": "en",
            "limit": max(1, min(limit, 10)),
            "sort": "published_desc",
        },
    )
    if not payload:
        return []

    results = []
    for article in payload.get("data", [])[:limit]:
        results.append(
            _provider_result(
                title=article.get("title", ""),
                summary=article.get("description") or article.get("snippet") or "",
                url=article.get("url", ""),
                source_name=article.get("source", "MediaStack"),
                published_at=article.get("published_at"),
                provider_reliability="medium",
            )
        )
    return results


async def search_newscatcher(query: str, limit: int) -> list[dict[str, Any]]:
    api_key = os.getenv("NEWSCATCHER_API_KEY")
    if not api_key:
        return []

    headers = {"User-Agent": USER_AGENT, "x-api-token": api_key}
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(
                "https://api.newscatcherapi.com/v2/search",
                params={
                    "q": query,
                    "lang": "en",
                    "page_size": max(1, min(limit, 10)),
                    "sort_by": "relevancy",
                },
                headers=headers,
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return []

    results = []
    for article in payload.get("articles", [])[:limit]:
        results.append(
            _provider_result(
                title=article.get("title", ""),
                summary=article.get("summary") or article.get("excerpt") or "",
                url=article.get("link", ""),
                source_name=article.get("clean_url", "Newscatcher"),
                published_at=article.get("published_date"),
                provider_reliability="medium",
            )
        )
    return results


async def search_webz(query: str, limit: int) -> list[dict[str, Any]]:
    api_key = os.getenv("WEBZ_API_KEY")
    if not api_key:
        return []

    payload = await _request_json(
        "https://api.webz.io/newsApiLite",
        {
            "token": api_key,
            "q": quote_plus(query),
            "size": max(1, min(limit, 10)),
        },
    )
    if not payload:
        return []

    posts = payload.get("posts") or payload.get("articles") or []
    results = []
    for article in posts[:limit]:
        thread = article.get("thread", {})
        results.append(
            _provider_result(
                title=article.get("title", ""),
                summary=article.get("text") or thread.get("title_full") or "",
                url=article.get("url", ""),
                source_name=thread.get("site_full", "Webz.io"),
                published_at=article.get("published"),
                provider_reliability="medium",
            )
        )
    return results


PROVIDER_SEARCHES = [
    ("NewsAPI", search_newsapi),
    ("GNews", search_gnews),
    ("The Guardian", search_guardian),
    ("Google Fact Check", search_google_fact_check),
    ("MediaStack", search_mediastack),
    ("Newscatcher", search_newscatcher),
    ("Webz.io", search_webz),
]


def _dedupe_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []

    for article in articles:
        key = (article.get("url") or article.get("title") or "").strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(article)

    return deduped


async def search_all_sources(query: str, limit_per_source: int = 3) -> dict[str, Any]:
    """Search across configured trusted source APIs."""
    tasks = [provider(query, limit_per_source) for _, provider in PROVIDER_SEARCHES]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    articles: list[dict[str, Any]] = []
    sources_checked: list[str] = []

    for (provider_name, _), result in zip(PROVIDER_SEARCHES, raw_results):
        sources_checked.append(provider_name)
        if isinstance(result, Exception):
            continue
        articles.extend(result)

    deduped = _dedupe_articles(articles)
    deduped.sort(
        key=lambda article: (
            0 if article.get("provider_reliability") == "high" else 1,
            article.get("published_at") or "",
        ),
        reverse=False,
    )

    return {
        "found": bool(deduped),
        "articles": deduped,
        "sources_checked": sources_checked,
        "provider_count": len(PROVIDER_SEARCHES),
    }


async def verify_claim_with_sources(claim: str) -> dict[str, Any]:
    """Return source-backed facts using configured fact-check and news APIs."""
    fact_checks = await search_google_fact_check(claim, limit=5)
    supporting_sources = await search_all_sources(claim, limit_per_source=2)

    facts = []
    for item in fact_checks:
        facts.append(
            {
                "claim": item["title"],
                "summary": item["extract"],
                "source": item["source_name"],
                "url": item["url"],
                "published_at": item.get("published_at"),
            }
        )

    if not facts:
        for item in supporting_sources.get("articles", [])[:5]:
            facts.append(
                {
                    "claim": item["title"],
                    "summary": item["extract"],
                    "source": item["source_name"],
                    "url": item["url"],
                    "published_at": item.get("published_at"),
                }
            )

    return {
        "verified": bool(facts),
        "facts": facts,
        "sources_checked": supporting_sources.get("sources_checked", []),
        "fact_check_results": len(fact_checks),
    }
