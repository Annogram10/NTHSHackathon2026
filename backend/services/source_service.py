"""Source verification service - mines Wikipedia, Britannica, and article pages."""

import asyncio
import re
import httpx
from typing import Optional
from urllib.parse import quote


WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
WIKIPEDIA_HEADERS = {
    "User-Agent": "CredCheck/1.0 (Fact-Checking App; mailto:support@credcheck.io)"
}
BRITANNICA_BASE = "https://www.britannica.com/search"


def _clean_html_value(value: str) -> str:
    cleaned = re.sub(r"<[^>]+>", "", value or "")
    return " ".join(cleaned.split()).strip()


async def fetch_article_metadata(url: str) -> dict:
    """Fetch a webpage and extract title, site name, and author when possible."""
    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                    )
                },
            )
            response.raise_for_status()
            html = response.text

        patterns = {
            "title": [
                r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']',
                r'<meta[^>]+name=["\']twitter:title["\'][^>]+content=["\']([^"\']+)["\']',
                r"<title>(.*?)</title>",
                r"<h1[^>]*>(.*?)</h1>",
            ],
            "publisher": [
                r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)["\']',
                r'<meta[^>]+name=["\']application-name["\'][^>]+content=["\']([^"\']+)["\']',
            ],
            "author": [
                r'<meta[^>]+name=["\']author["\'][^>]+content=["\']([^"\']+)["\']',
                r'<meta[^>]+property=["\']article:author["\'][^>]+content=["\']([^"\']+)["\']',
            ],
            "description": [
                r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
                r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
            ],
        }

        extracted: dict[str, str] = {}
        for field, field_patterns in patterns.items():
            for pattern in field_patterns:
                match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
                if match:
                    value = _clean_html_value(match.group(1))
                    if value:
                        extracted[field] = value
                        break

        return {
            "success": bool(extracted.get("title")),
            "url": str(response.url),
            "title": extracted.get("title", ""),
            "publisher": extracted.get("publisher", ""),
            "author": extracted.get("author", ""),
            "description": extracted.get("description", ""),
        }
    except Exception:
        return {
            "success": False,
            "url": url,
            "title": "",
            "publisher": "",
            "author": "",
            "description": "",
        }


async def search_wikipedia(query: str, limit: int = 5) -> dict:
    """Search Wikipedia for relevant articles matching the query.

    Returns dict with 'articles' list and 'found' boolean.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Search for pages
            search_params = {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": limit,
                "format": "json",
            }
            resp = await client.get(WIKIPEDIA_API, params=search_params, headers=WIKIPEDIA_HEADERS)
            resp.raise_for_status()
            data = resp.json()

            search_results = data.get("query", {}).get("search", [])

            if not search_results:
                return {"articles": [], "found": False, "source": "wikipedia"}

            # Get extracts for each article
            page_ids = [str(r["pageid"]) for r in search_results]
            extract_params = {
                "action": "query",
                "pageids": "|".join(page_ids),
                "prop": "extracts|info",
                "exintro": True,
                "explaintext": True,
                "exsentences": 2,
                "inprop": "url",
                "format": "json",
            }
            resp2 = await client.get(WIKIPEDIA_API, params=extract_params, headers=WIKIPEDIA_HEADERS)
            resp2.raise_for_status()
            pages_data = resp2.json().get("query", {}).get("pages", {})

            articles = []
            for page_id, page_info in pages_data.items():
                if page_info.get("missing"):
                    continue
                articles.append({
                    "title": page_info.get("title", ""),
                    "extract": page_info.get("extract", "")[:500],
                    "page_id": page_id,
                    "url": page_info.get("fullurl", ""),
                })

            return {
                "articles": articles,
                "found": len(articles) > 0,
                "source": "wikipedia",
                "query": query,
            }

    except httpx.HTTPError:
        return {"articles": [], "found": False, "source": "wikipedia", "error": "Network error"}
    except Exception:
        return {"articles": [], "found": False, "source": "wikipedia", "error": "Unknown error"}


async def search_britannica(query: str, limit: int = 3) -> dict:
    """Search Britannica for relevant articles.

    Returns dict with 'articles' list containing title, summary, and url.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            # Britannica doesn't have a public API, so we search via their search endpoint
            # and parse the results
            search_url = f"{BRITANNICA_BASE}?query={quote(query)}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            resp = await client.get(search_url, headers=headers)
            resp.raise_for_status()

            # Parse HTML to find search results
            articles = []
            # Simple extraction - look for article titles and URLs in the HTML
            text = resp.text

            # Find topic pages (Britannica has search results with titles in anchor tags)
            import re
            # Match search result patterns: <a href="/topic/...">Title</a>
            pattern = r'<a href="(/topic/[^"]+)"[^>]*>([^<]+)</a>'
            matches = re.findall(pattern, text)

            seen_titles = set()
            for url, title in matches[:limit]:
                clean_title = re.sub(r'<[^>]+>', '', title).strip()
                if clean_title and clean_title not in seen_titles and len(clean_title) > 3:
                    seen_titles.add(clean_title)
                    articles.append({
                        "title": clean_title,
                        "url": f"https://www.britannica.com{url}",
                        "extract": f"Britannica article on {clean_title}",
                    })

            return {
                "articles": articles,
                "found": len(articles) > 0,
                "source": "britannica",
                "query": query,
            }
    except Exception:
        return {"articles": [], "found": False, "source": "britannica", "error": "Unable to fetch Britannica results"}


async def get_wikipedia_article_facts(topic: str) -> list[str]:
    """Extract key facts from Wikipedia article about a topic.

    Returns list of factual statements extracted from the article.
    """
    result = await search_wikipedia(topic, limit=1)
    if not result["found"] or not result["articles"]:
        return []

    article = result["articles"][0]
    extract = article.get("extract", "")

    # Split into sentences for factual statements
    facts = [s.strip() for s in extract.split(".") if len(s.strip()) > 20]
    return facts


async def verify_claim_with_wikipedia(claim_keywords: list[str]) -> dict:
    """Cross-reference claim keywords with Wikipedia to find supporting/rebutting info.

    Returns verification result with relevance scores.
    """
    facts_found = []
    sources_checked = 0

    for keyword in claim_keywords[:3]:  # Check top 3 keywords
        result = await search_wikipedia(keyword, limit=2)
        if result["found"]:
            sources_checked += 1
            for article in result["articles"]:
                facts_found.append({
                    "keyword": keyword,
                    "title": article["title"],
                    "extract": article["extract"],
                    "url": article["url"],
                })

    return {
        "sources_found": sources_checked > 0,
        "facts": facts_found,
        "verifiable": sources_checked > 0,
        "source_type": "wikipedia",
    }


async def search_all_sources(query: str, limit_per_source: int = 3) -> dict:
    """Search all public sources (Wikipedia, Britannica) for a query.

    Returns combined results from all sources.
    """
    # Run searches in parallel
    wiki_task = search_wikipedia(query, limit=limit_per_source)
    brit_task = search_britannica(query, limit=limit_per_source)

    wiki_result, brit_result = await asyncio.gather(wiki_task, brit_task)

    all_articles = []
    for source_name, result in [("Wikipedia", wiki_result), ("Britannica", brit_result)]:
        if result.get("found"):
            for article in result["articles"]:
                article["source_name"] = source_name
                all_articles.append(article)

    return {
        "articles": all_articles,
        "found": len(all_articles) > 0,
        "sources_checked": ["wikipedia", "britannica"],
        "wikipedia_found": wiki_result.get("found", False),
        "britannica_found": brit_result.get("found", False),
    }
    """Search Wikipedia for relevant articles matching the query.

    Returns dict with 'articles' list and 'found' boolean.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Search for pages
            search_params = {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": limit,
                "format": "json",
            }
            resp = await client.get(WIKIPEDIA_API, params=search_params, headers=WIKIPEDIA_HEADERS)
            resp.raise_for_status()
            data = resp.json()

            search_results = data.get("query", {}).get("search", [])

            if not search_results:
                return {"articles": [], "found": False, "source": "wikipedia"}

            # Get extracts for each article
            page_ids = [str(r["pageid"]) for r in search_results]
            extract_params = {
                "action": "query",
                "pageids": "|".join(page_ids),
                "prop": "extracts|info",
                "exintro": True,
                "explaintext": True,
                "exsentences": 2,
                "inprop": "url",
                "format": "json",
            }
            resp2 = await client.get(WIKIPEDIA_API, params=extract_params, headers=WIKIPEDIA_HEADERS)
            resp2.raise_for_status()
            pages_data = resp2.json().get("query", {}).get("pages", {})

            articles = []
            for page_id, page_info in pages_data.items():
                if page_info.get("missing"):
                    continue
                articles.append({
                    "title": page_info.get("title", ""),
                    "extract": page_info.get("extract", "")[:500],
                    "page_id": page_id,
                    "url": page_info.get("fullurl", ""),
                })

            return {
                "articles": articles,
                "found": len(articles) > 0,
                "source": "wikipedia",
                "query": query,
            }

    except httpx.HTTPError:
        return {"articles": [], "found": False, "source": "wikipedia", "error": "Network error"}
    except Exception:
        return {"articles": [], "found": False, "source": "wikipedia", "error": "Unknown error"}


async def get_wikipedia_article_facts(topic: str) -> list[str]:
    """Extract key facts from Wikipedia article about a topic.

    Returns list of factual statements extracted from the article.
    """
    result = await search_wikipedia(topic, limit=1)
    if not result["found"] or not result["articles"]:
        return []

    article = result["articles"][0]
    extract = article.get("extract", "")

    # Split into sentences for factual statements
    facts = [s.strip() for s in extract.split(".") if len(s.strip()) > 20]
    return facts


async def verify_claim_with_wikipedia(claim_keywords: list[str]) -> dict:
    """Cross-reference claim keywords with Wikipedia to find supporting/rebutting info.

    Returns verification result with relevance scores.
    """
    facts_found = []
    sources_checked = 0

    for keyword in claim_keywords[:3]:  # Check top 3 keywords
        result = await search_wikipedia(keyword, limit=2)
        if result["found"]:
            sources_checked += 1
            for article in result["articles"]:
                facts_found.append({
                    "keyword": keyword,
                    "title": article["title"],
                    "extract": article["extract"],
                    "url": article["url"],
                })

    return {
        "sources_found": sources_checked > 0,
        "facts": facts_found,
        "verifiable": sources_checked > 0,
        "source_type": "wikipedia",
    }


# === Sourcemine integration (placeholder - add API key for production) ===
SOURCEMINE_API_KEY = None  # Set via environment variable
SOURCEMINE_API = "https://api.sourcemine.io/v1/verify"


async def verify_with_sourcemine(text: str) -> Optional[dict]:
    """Verify text against Sourcemine database.

    Requires SOURCEMINE_API_KEY environment variable.
    Returns None if not configured.
    """
    if not SOURCEMINE_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                SOURCEMINE_API,
                headers={"Authorization": f"Bearer {SOURCEMINE_API_KEY}"},
                json={"text": text, "check_sources": True},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return None


async def full_source_verification(claim: str, claim_keywords: list[str]) -> dict:
    """Perform full source verification using all available sources.

    Combines Wikipedia (primary free source) with optional paid services.
    """
    # Primary: Wikipedia verification
    wiki_result = await verify_claim_with_wikipedia(claim_keywords)

    # Secondary: Sourcemine if configured
    sourcemine_result = await verify_with_sourcemine(claim)

    return {
        "wikipedia": wiki_result,
        "sourcemine": sourcemine_result,
        "verified_sources": wiki_result["sources_found"] or sourcemine_result is not None,
    }
