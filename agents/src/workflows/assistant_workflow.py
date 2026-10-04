import logging
from typing import Any, Dict, List, Optional
from src.config import settings
from src.schemas.contracts import AssistantQueryRequest, AssistantQueryResponse
from src.tools.domain_tools import classify_job_category
from src.tools.action_tools import search_providers, search_service_listings, CATEGORY_BENCHMARKS

logger = logging.getLogger(__name__)

GREETINGS = {
    "hi", "hello", "hey", "hola", "good morning", "good afternoon",
    "good evening", "howdy", "greetings", "hi there", "hello there", "what's up", "yo"
}


def _is_greeting(text: str) -> bool:
    cleaned = text.lower().strip().rstrip("!?.,")
    if cleaned in GREETINGS:
        return True
    return any(cleaned.startswith(g + " ") for g in ("hi", "hello", "hey", "good morning", "good afternoon", "good evening"))


def _get_llm():
    if not settings.OPENAI_API_KEY:
        return None
    try:
        from langchain_openai import ChatOpenAI
        base_url = settings.OPENAI_BASE_URL or "https://generativelanguage.googleapis.com/v1beta/openai/"
        model = settings.DEFAULT_MODEL or "gemini-3.8-flash"
        return ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=base_url,
            model=model,
            temperature=0.7,
            max_tokens=1000,
            timeout=8.0,
        )
    except Exception as e:
        logger.warning(f"Could not initialize ChatOpenAI: {e}")
        return None


def _sanitize_suggestions(suggestions: List[str]) -> List[str]:
    blocked = ("instant match", "priority book", "book now", "emergency book", "prioity")
    clean = []
    for s in suggestions:
        s_lower = s.lower()
        if any(b in s_lower for b in blocked):
            continue
        if s_lower.startswith("book "):
            s = "View " + s[5:]
        clean.append(s)
    return clean


async def process_assistant_query(request: AssistantQueryRequest) -> AssistantQueryResponse:
    """
    Handles customer conversational queries:
    - Identifies greetings and platform chit-chat vs trade requests
    - Searches matching verified providers and catalog service listings
    - Formulates natural language reply powered by LLM and live platform data
    - Surfaces profile and service links without in-chat booking or instant-match
    """
    query = request.query.strip()
    llm = _get_llm()

    # 1. Handle casual greetings and chit-chat
    if _is_greeting(query):
        reply = (
            "Hello! 👋 I'm your Handee AI Assistant. I can help you find verified technicians "
            "(AC repair, plumbing, electrical, carpentry, painting, cleaning), browse active service listings, "
            "or check platform pricing benchmarks. What trade service do you need help with today?"
        )
        if llm:
            try:
                system_prompt = (
                    "You are the Handee AI Assistant on the Handee home services marketplace in Sri Lanka. "
                    "The user is saying hello or greeting you. Greet them warmly in 1-2 friendly sentences, "
                    "and invite them to ask about trade services (AC repair, plumbing, electrical, carpentry, painting) or price estimates."
                )
                res = await llm.ainvoke([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ])
                if res and res.content and len(res.content.strip()) > 5:
                    reply = res.content.strip()
            except Exception as e:
                logger.info(f"LLM greeting fallback: {e}")

        return AssistantQueryResponse(
            reply=reply,
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "Find AC Repair specialists",
                "Plumbing repair in Colombo",
                "Electrical switchboard inspection",
                "How does provider verification work?"
            ])
        )

    # 2. Classify intent / trade category
    cat_result = classify_job_category(query)
    is_trade_query = (not cat_result.is_ambiguous) and (cat_result.confidence >= 0.25)
    category = cat_result.category

    # 3. Handle general questions or non-trade platform inquiries
    if not is_trade_query:
        if llm:
            try:
                system_prompt = (
                    "You are the Handee AI Assistant for Handee, a verified on-demand trade service marketplace "
                    "(AC Repair, Plumbing, Electrical, Carpentry, Painting, Appliance Repair, Cleaning) in Sri Lanka. "
                    "Answer the user's question directly, concisely, and helpfully in 2-3 sentences. "
                    "If they are asking for help with trade work, ask them which trade or describe their issue."
                )
                res = await llm.ainvoke([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ])
                if res and res.content and len(res.content.strip()) > 5:
                    return AssistantQueryResponse(
                        reply=res.content.strip(),
                        category="General",
                        suggested_providers=[],
                        suggested_listings=[],
                        suggestions=_sanitize_suggestions([
                            "Need AC Repair in Colombo",
                            "Plumbing repair rates",
                            "Electrical safety audit",
                            "Browse all service listings"
                        ])
                    )
            except Exception as e:
                logger.info(f"LLM general query fallback: {e}")

        # Fallback if LLM is unavailable
        return AssistantQueryResponse(
            reply=(
                "I'm here to help with home trade services! Which service are you looking for? "
                "We provide verified professionals for AC Repair, Plumbing, Electrical, Carpentry, Painting, and General Maintenance."
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "Find AC Repair technicians",
                "Plumbing pipe inspection",
                "Electrical wiring check",
                "Explore Service Listings"
            ])
        )

    # 4. Specific Trade Request: query matching live providers and service listings
    providers = await search_providers(category, "Colombo")
    listings = await search_service_listings(query, category)
    benchmark = CATEGORY_BENCHMARKS.get(category, 3500.0)

    top_listing = listings[0] if listings else None
    top_provider = providers[0] if providers else None

    reply = None
    if llm:
        try:
            listing_info = (
                f"Top listing: '{top_listing['title']}' by {top_listing['providerName']} (Rs. {int(top_listing['price']):,})"
                if top_listing else "No active fixed-price listings yet."
            )
            provider_info = (
                f"Top provider: {top_provider['fullName']} (Rating: {top_provider.get('rating', 4.8)}★, {len(providers)} verified specialists available)"
                if top_provider else "Qualified providers available across Colombo."
            )
            prompt = (
                f"You are the Handee AI Assistant. The user query is: '{query}'.\n"
                f"Trade category detected: {category}.\n"
                f"Benchmark price: Rs. {int(benchmark):,}.\n"
                f"Real platform listings: {listing_info}.\n"
                f"Real platform providers: {provider_info}.\n\n"
                f"Formulate a concise, helpful informational response (2-3 sentences max) for {category} recommending the service or provider, "
                f"explicitly mentioning the {category} service, highlighting real prices and verified qualifications. Do NOT offer to book, reserve, or instant match directly in chat. "
                f"Explain that customers can check the provider's profile or service listing for details."
            )
            res = await llm.ainvoke([
                {"role": "system", "content": "You are the friendly, helpful Handee AI Assistant on Handee marketplace."},
                {"role": "user", "content": prompt}
            ])
            if res and res.content and len(res.content.strip()) > 10:
                reply = res.content.strip()
        except Exception as e:
            logger.info(f"LLM trade response fallback: {e}")

    # Deterministic fallback when LLM is unavailable
    if not reply:
        if top_listing and top_listing.get("providerName"):
            reply = (
                f"I found {category} services on Handee! "
                f"Recommended listing: **{top_listing['title']}** by **{top_listing['providerName']}** (Rs. {int(top_listing['price']):,}). "
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

    suggestions = [
        f"View {category} Pricing Guide",
        f"Browse verified {category} specialists",
    ]
    if top_listing:
        suggestions.append(f"View {top_listing['title']} (Rs. {int(top_listing['price']):,})")
    suggestions.append(f"Compare {category} rates")

    return AssistantQueryResponse(
        reply=reply,
        category=category,
        suggested_providers=providers[:3],
        suggested_listings=listings[:2],
        suggestions=_sanitize_suggestions(suggestions)
    )
