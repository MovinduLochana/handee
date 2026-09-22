import logging
from typing import Any, Dict, List, Optional
import httpx
from src.config import settings

logger = logging.getLogger(__name__)

# Baseline hourly and fixed service price averages (LKR)
CATEGORY_BENCHMARKS: Dict[str, float] = {
    "Plumbing": 3500.0,
    "Electrical": 4000.0,
    "AC Repair": 5000.0,
    "Carpentry": 3800.0,
    "Painting": 3200.0,
    "Masonry": 4200.0,
    "Appliance Repair": 3500.0,
    "Cleaning": 2500.0,
    "Roofing": 4500.0,
    "General Maintenance": 3000.0,
}

# Standalone seed providers pool used when backend is empty or during offline testing
SEED_PROVIDERS: List[Dict[str, Any]] = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "userId": "11111111-1111-1111-1111-111111111111",
        "fullName": "Sunil Perera",
        "skillCategories": ["Plumbing", "General Maintenance"],
        "serviceArea": "Colombo",
        "rating": 4.9,
        "totalReviews": 34,
        "isVerified": True,
        "verificationStatus": "Verified",
        "hourlyRate": 3500.0,
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "userId": "22222222-2222-2222-2222-222222222222",
        "fullName": "Kamal Fernando",
        "skillCategories": ["Electrical", "AC Repair"],
        "serviceArea": "Colombo",
        "rating": 4.8,
        "totalReviews": 21,
        "isVerified": True,
        "verificationStatus": "Verified",
        "hourlyRate": 4200.0,
    },
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "userId": "33333333-3333-3333-3333-333333333333",
        "fullName": "Nimal Jayasinghe",
        "skillCategories": ["Painting", "Carpentry"],
        "serviceArea": "Kandy",
        "rating": 4.7,
        "totalReviews": 15,
        "isVerified": True,
        "verificationStatus": "Verified",
        "hourlyRate": 3200.0,
    },
    {
        "id": "44444444-4444-4444-4444-444444444444",
        "userId": "44444444-4444-4444-4444-444444444444",
        "fullName": "Nuwan Silva",
        "skillCategories": ["AC Repair", "Electrical"],
        "serviceArea": "Gampaha",
        "rating": 4.9,
        "totalReviews": 28,
        "isVerified": True,
        "verificationStatus": "Verified",
        "hourlyRate": 4800.0,
    },
    {
        "id": "55555555-5555-5555-5555-555555555555",
        "userId": "55555555-5555-5555-5555-555555555555",
        "fullName": "Rohan Wickramasinghe",
        "skillCategories": ["Plumbing"],
        "serviceArea": "Colombo",
        "rating": 3.8,
        "totalReviews": 2,
        "isVerified": False,
        "verificationStatus": "Pending",
        "hourlyRate": 2800.0,
    }
]

SERVICE_LISTINGS: List[Dict[str, Any]] = [
    {
        "id": "list-ac-service",
        "title": "Standard AC Cleaning & Inspection",
        "category": "AC Repair",
        "price": 4500.0,
        "providerName": "Nuwan Silva",
        "providerId": "44444444-4444-4444-4444-444444444444",
        "rating": 4.9,
    },
    {
        "id": "list-plumbing-leak",
        "title": "Pipe Leak Detection & Tap Repair",
        "category": "Plumbing",
        "price": 3000.0,
        "providerName": "Sunil Perera",
        "providerId": "11111111-1111-1111-1111-111111111111",
        "rating": 4.9,
    },
    {
        "id": "list-electrical-inspection",
        "title": "Home Electrical Safety Audit & Breaker Check",
        "category": "Electrical",
        "price": 5000.0,
        "providerName": "Kamal Fernando",
        "providerId": "22222222-2222-2222-2222-222222222222",
        "rating": 4.8,
    }
]


async def search_providers(
    category: str,
    location: str,
    radius_km: float = 25.0
) -> List[Dict[str, Any]]:
    """
    Finds candidate verified providers matching trade category and location.
    Attempts live backend query first, falling back to seed pool.
    """
    providers: List[Dict[str, Any]] = []

    # Attempt to query backend search endpoint
    backend_url = f"{settings.BACKEND_BASE_URL.rstrip('/')}/api/providers/search"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(backend_url, params={"searchTerm": category, "radiusKm": radius_km})
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                for item in items:
                    providers.append({
                        "id": str(item.get("id")),
                        "userId": str(item.get("userId")),
                        "fullName": item.get("fullName", "Unknown Provider"),
                        "skillCategories": [s.get("name") if isinstance(s, dict) else str(s) for s in item.get("skillCategories", [])],
                        "serviceArea": item.get("serviceAreaDisplayName") or item.get("city") or "Sri Lanka",
                        "rating": float(item.get("ratingAggregate", 0.0) or item.get("rating", 4.5)),
                        "totalReviews": int(item.get("totalReviewCount", 0)),
                        "isVerified": item.get("verificationStatus") == "Verified",
                        "verificationStatus": item.get("verificationStatus", "Pending"),
                        "hourlyRate": float(item.get("hourlyRate", 3500.0)),
                    })
    except Exception as e:
        logger.info(f"Backend search not reachable ({e}), using candidate provider pool.")

    if not providers:
        # Filter candidate pool by category matching
        cat_lower = category.lower()
        matched = [
            p for p in SEED_PROVIDERS
            if any(cat_lower in skill.lower() for skill in p["skillCategories"])
        ]
        providers = matched if matched else SEED_PROVIDERS[:3]

    # Rank providers by verification first, then rating descending
    providers.sort(key=lambda p: (1 if p.get("isVerified") else 0, p.get("rating", 0.0)), reverse=True)
    return providers


def estimate_price(
    category: str,
    scope: Dict[str, Any],
    urgency: str = "normal",
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None
) -> float:
    """
    Calculates fair market price estimate based on category benchmark,
    complexity multiplier, urgency, and budget constraints.
    """
    base_benchmark = CATEGORY_BENCHMARKS.get(category, 3500.0)
    multiplier = scope.get("price_multiplier", 1.0)
    raw_estimate = base_benchmark * multiplier

    # Align with customer budget range if reasonable
    if budget_min is not None and budget_max is not None:
        customer_midpoint = (budget_min + budget_max) / 2.0
        # Blend benchmark with customer expectation (60% benchmark, 40% customer midpoint)
        blended = (0.6 * raw_estimate) + (0.4 * customer_midpoint)
        # Ensure within budget if possible
        raw_estimate = max(budget_min, min(budget_max, blended))
    elif budget_max is not None and raw_estimate > budget_max:
        # If above max but within 20%, cap at budget_max
        if raw_estimate <= budget_max * 1.2:
            raw_estimate = budget_max

    return round(raw_estimate, 2)


def check_provider_rating(provider: Dict[str, Any]) -> Dict[str, Any]:
    """Inspects provider rating and reviews count for risk analysis."""
    rating = float(provider.get("rating", 0.0))
    reviews = int(provider.get("totalReviews", 0))
    is_new = reviews < 3
    passed = rating >= 4.0 or (is_new and rating >= 0.0)

    return {
        "rating": rating,
        "totalReviews": reviews,
        "is_new_provider": is_new,
        "passed": passed
    }


def search_service_listings(query: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Searches fixed-price service listings catalog."""
    results = []
    q = query.lower()
    for item in SERVICE_LISTINGS:
        if category and category.lower() in item["category"].lower():
            results.append(item)
        elif q in item["title"].lower() or q in item["category"].lower():
            results.append(item)
    return results if results else SERVICE_LISTINGS[:2]
