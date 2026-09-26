from typing import Any, Dict, List, Optional
from src.schemas.contracts import AssistantQueryRequest, AssistantQueryResponse
from src.tools.domain_tools import classify_job_category
from src.tools.action_tools import search_providers, search_service_listings, CATEGORY_BENCHMARKS


async def process_assistant_query(request: AssistantQueryRequest) -> AssistantQueryResponse:
    """
    Handles customer conversational queries:
    - Extracts trade intent and category
    - Searches matching verified providers and catalog service listings
    - Formulates natural language reply with actionable suggestions
    """
    query = request.query.strip()
    
    # 1. Classify intent / category
    cat_result = classify_job_category(query)
    category = cat_result.category
    
    # 2. Query matching providers & listings
    providers = await search_providers(category, "Colombo")
    listings = await search_service_listings(query, category)
    
    benchmark = CATEGORY_BENCHMARKS.get(category, 3500.0)
    
    # Format intelligent friendly response
    top_provider = providers[0] if providers else None
    top_listing = listings[0] if listings else None

    if top_listing and top_listing.get("providerName"):
        listing_title = top_listing["title"]
        listing_price = int(top_listing["price"])
        listing_prov = top_listing["providerName"]
        reply = (
            f"I found {category} services on Handee! "
            f"Recommended listing: **{listing_title}** by **{listing_prov}** (Rs. {listing_price:,}). "
            f"Platform benchmark pricing for {category} starts around Rs. {int(benchmark):,}."
        )
    elif top_provider:
        prov_name = top_provider.get("fullName", "Verified Provider")
        prov_rating = top_provider.get("rating", 4.8)
        reply = (
            f"I found {len(providers)} verified {category} specialists available in your area. "
            f"Top recommendation: **{prov_name}** ({prov_rating}★). "
            f"Platform benchmark pricing for {category} typically starts at around Rs. {int(benchmark):,}."
        )
    else:
        reply = (
            f"We have qualified tradespeople covering {category}. "
            f"Standard pricing benchmarks for {category} are around Rs. {int(benchmark):,}."
        )
    
    suggestions: List[str] = [
        f"Request Instant Match for {category}",
        f"View {category} Pricing Guide",
    ]
    
    if listings:
        suggestions.append(f"Book {top_listing['title']} (Rs. {int(top_listing['price']):,})")
    
    suggestions.append("Find emergency providers")
    
    return AssistantQueryResponse(
        reply=reply,
        category=category,
        suggested_providers=providers[:3],
        suggested_listings=listings[:2],
        suggestions=suggestions
    )
