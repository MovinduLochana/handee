import logging
import re
import time
from typing import Any, Dict, List, Optional
from src.config import settings
from src.schemas.contracts import AssistantQueryRequest, AssistantQueryResponse
from src.tools.domain_tools import classify_job_category
from src.tools.action_tools import search_providers, search_service_listings, CATEGORY_BENCHMARKS

logger = logging.getLogger(__name__)

# --- LLM Circuit Breaker & Rate-Limit Tracking ---
_llm_rate_limit_until: float = 0.0


def _is_llm_available() -> bool:
    return time.time() > _llm_rate_limit_until


def _record_llm_failure(err: Exception) -> None:
    global _llm_rate_limit_until
    err_str = str(err).lower()
    if "429" in err_str or "quota" in err_str or "ratelimit" in err_str or "exceeded" in err_str:
        logger.warning(f"LLM quota/rate-limit hit. Activating 10-minute circuit breaker cooldown: {err}")
        _llm_rate_limit_until = time.time() + 600.0
    else:
        logger.info(f"LLM call failed: {err}")


def _get_llm():
    if not settings.OPENAI_API_KEY:
        return None
    if not _is_llm_available():
        logger.debug("LLM in rate-limit cooldown, using deterministic knowledge base")
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


# --- Regex Pattern Matchers for Intents ---
GREETINGS_PATTERN = re.compile(
    r"^(hi|hello|hey|hola|good\s+(morning|afternoon|evening)|howdy|greetings|hi\s+there|hello\s+there|what'?s\s+up|yo)\b",
    re.IGNORECASE,
)

GRATITUDE_PATTERN = re.compile(
    r"\b(thank|thanks|thx|thank\s*you|appreciate\s*it|awesome|great\s*job|good\s*job|perfect)\b",
    re.IGNORECASE,
)

FAREWELL_PATTERN = re.compile(
    r"\b(bye|goodbye|see\s*you|good\s*night|take\s*care|have\s*a\s*(nice|great|good)\s*day)\b",
    re.IGNORECASE,
)

BOT_IDENTITY_PATTERN = re.compile(
    r"\b(who\s*are\s*you|what\s*are\s*you|what\s*can\s*you\s*do|what\s*is\s*your\s*name|are\s*you\s*(a\s*)?(bot|ai|robot|real))\b",
    re.IGNORECASE,
)

HOW_IT_WORKS_PATTERN = re.compile(
    r"\b(how\s*(does|do)\s*(handee|it|this\s*app)\s*work|what\s*is\s*handee|about\s*handee|how\s*to\s*use(\s*handee)?)\b",
    re.IGNORECASE,
)

PAYMENT_ESCROW_PATTERN = re.compile(
    r"\b(pay|payment|escrow|cash|card|credit\s*card|debit\s*card|online\s*payment|invoice|bill|billing|charge|receipt|koko|payhere)\b",
    re.IGNORECASE,
)

CANCELLATION_REFUND_PATTERN = re.compile(
    r"\b(cancel|cancellation|cancelling|reschedule|rescheduling|change\s*time|change\s*date|refund|money\s*back|dispute)\b",
    re.IGNORECASE,
)

SAFETY_VERIFICATION_PATTERN = re.compile(
    r"\b(verif(ied|ication|y)?|safe|safety|trust|background\s*check|vet(ting|ted)?|police(\s*report)?|nic|id\s*check|insured|insurance|guarantee)\b",
    re.IGNORECASE,
)

SUPPORT_CONTACT_PATTERN = re.compile(
    r"\b(support|help\s*desk|helpline|customer\s*care|contact|phone\s*number|call\s*you|call\s*support|reach\s*out|complaint|email(\s*address)?)\b",
    re.IGNORECASE,
)

SERVICES_OFFERED_PATTERN = re.compile(
    r"\b(what\s*services|services\s*(do\s*you|offered|available|provided)|list\s*of\s*services|all\s*services|what\s*trades)\b",
    re.IGNORECASE,
)

PRICING_INQUIRY_PATTERN = re.compile(
    r"\b(how\s*much|cost|costs|pricing|price|prices|rates?|quote|fee|charges?|benchmark)\b",
    re.IGNORECASE,
)


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
    - Identifies greetings, gratitude, farewells, bot identity, and platform FAQs
    - Distinguishes general pricing inquiries from direct trade requests
    - Searches matching verified providers and catalog service listings for trade queries
    - Employs a robust rule-based platform knowledge engine resilient to LLM quota exhaustion
    - Surfaces profile and service links without in-chat booking or instant-match
    """
    query = request.query.strip()
    llm = _get_llm()

    # 1. Casual Greetings
    if GREETINGS_PATTERN.search(query):
        reply = (
            "Hello! 👋 I'm your Handee AI Assistant. I can help you find verified technicians "
            "(AC repair, plumbing, electrical, carpentry, painting, cleaning), browse active service listings, "
            "or answer questions about pricing benchmarks and escrow payments. What can I help you with today?"
        )
        if llm:
            try:
                prompt = (
                    "You are the Handee AI Assistant on the Handee home services marketplace in Sri Lanka. "
                    "The user is saying hello. Greet them warmly in 1-2 friendly sentences and invite them "
                    "to ask about home trades (AC, plumbing, electrical, painting, carpentry) or platform pricing."
                )
                res = await llm.ainvoke([
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": query}
                ])
                if res and res.content and len(res.content.strip()) > 5:
                    reply = res.content.strip()
            except Exception as e:
                _record_llm_failure(e)

        return AssistantQueryResponse(
            reply=reply,
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "Find AC Repair specialists",
                "Plumbing repair in Colombo",
                "Electrical switchboard inspection",
                "How does Handee work?"
            ])
        )

    # 2. Gratitude / Politeness
    if GRATITUDE_PATTERN.search(query):
        return AssistantQueryResponse(
            reply=(
                "You're very welcome! 😊 If you need help finding verified technicians, "
                "checking benchmark rates, or have any questions about your bookings, I'm always here to assist."
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "Find AC Repair specialists",
                "Find Plumber in Colombo",
                "Browse all service listings",
                "Check Pricing Guide"
            ])
        )

    # 3. Farewells
    if FAREWELL_PATTERN.search(query):
        return AssistantQueryResponse(
            reply=(
                "Goodbye! Have a wonderful day ahead. Whenever you need quality home trade services "
                "or trusted specialists, Handee is here for you! 👋"
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "Explore Service Listings",
                "Find Electricians",
                "How does Handee work?"
            ])
        )

    # 4. Bot Identity / Capabilities
    if BOT_IDENTITY_PATTERN.search(query):
        return AssistantQueryResponse(
            reply=(
                "I am the **Handee AI Assistant** 🤖, your smart concierge for home trade services across Sri Lanka. "
                "I can help you:\n\n"
                "• **Find Verified Technicians**: AC mechanics, plumbers, electricians, carpenters, painters, and cleaners\n"
                "• **Explore Pricing Benchmarks**: Transparent rates and standard diagnostic benchmarks\n"
                "• **Explain Platform Protection**: How our secure escrow payments, NIC vetting, and cancellation policies work"
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "How does Handee work?",
                "Find AC Repair specialists",
                "How does escrow payment work?",
                "What services do you offer?"
            ])
        )

    # 5. How Handee Works / About Handee
    if HOW_IT_WORKS_PATTERN.search(query):
        return AssistantQueryResponse(
            reply=(
                "Handee connects you with verified local trade professionals in 3 easy steps:\n\n"
                "1. **Select a Service**: Browse verified specialists or fixed-price listings for AC, plumbing, electrical, carpentry, and painting.\n"
                "2. **Book & Schedule**: Request a service or pick an available technician at your preferred date and time.\n"
                "3. **Secure Escrow Protection**: You approve an upfront itemized quote. Payment is held securely in escrow and only released to the technician after you inspect and confirm completion."
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "How does escrow payment work?",
                "Are technicians verified?",
                "View AC Repair services",
                "Check pricing benchmarks"
            ])
        )

    # 6. Payment, Escrow, and Invoicing
    if PAYMENT_ESCROW_PATTERN.search(query):
        return AssistantQueryResponse(
            reply=(
                "All services on Handee are safeguarded by **Escrow Payment Protection**:\n\n"
                "• **Safe Escrow Hold**: When you accept a job quote, your payment is held securely in escrow. Funds are **never** released to the technician until you confirm the work is completed to your satisfaction.\n"
                "• **Payment Methods**: We support major Visa/Mastercard credit and debit cards, secure digital payments, and Cash on Completion for eligible bookings.\n"
                "• **Transparent Invoicing**: You receive a comprehensive, itemized digital invoice with labor and material costs clearly broken down."
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "Can I cancel a booking?",
                "Are technicians verified?",
                "Check AC Repair rates",
                "Find Plumbing specialists"
            ])
        )

    # 7. Cancellations, Rescheduling, and Refunds
    if CANCELLATION_REFUND_PATTERN.search(query):
        return AssistantQueryResponse(
            reply=(
                "You have full control over your bookings directly from the **'My Bookings'** tab:\n\n"
                "• **Free Cancellations**: Cancellations made before technician dispatch are 100% refunded to your original payment method.\n"
                "• **Easy Rescheduling**: You can request a new date or time slot with your technician at no additional fee.\n"
                "• **Refund Guarantee**: If a job cannot be performed or does not meet agreed quality, Handee's escrow dispute resolution ensures a swift investigation and prompt refund."
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "How does escrow payment work?",
                "Contact customer support",
                "Browse service listings",
                "How does Handee work?"
            ])
        )

    # 8. Safety, Trust, and Verification
    if SAFETY_VERIFICATION_PATTERN.search(query):
        return AssistantQueryResponse(
            reply=(
                "Safety and quality are our top priorities. Every technician on Handee completes a **multi-stage vetting process**:\n\n"
                "• **Identity Verification**: National Identity Card (NIC) & residential address validation.\n"
                "• **Background Check**: Criminal record clearances to ensure home safety.\n"
                "• **Trade Skill Assessment**: Verification of trade qualifications and certified experience.\n"
                "• **Customer Reviews**: Technicians must maintain high satisfaction ratings (4.5+ ★) to remain active on the platform."
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "How does escrow payment work?",
                "View verified technicians",
                "How does Handee work?",
                "Check AC Repair specialists"
            ])
        )

    # 9. Customer Support & Contact Info
    if SUPPORT_CONTACT_PATTERN.search(query):
        return AssistantQueryResponse(
            reply=(
                "Our dedicated customer support team is available 7 days a week to help with bookings, invoices, and trade questions:\n\n"
                "• **Email Support**: support@handee.lk\n"
                "• **Helpline**: +94 11 234 5678 (8:00 AM – 8:00 PM daily)\n"
                "• **In-App Support**: Visit the 'Support & Help Center' section in your account profile."
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "How does Handee work?",
                "How does escrow payment work?",
                "Find Plumbing specialists",
                "Browse service listings"
            ])
        )

    # 10. Services Offered / Categories Overview
    if SERVICES_OFFERED_PATTERN.search(query):
        return AssistantQueryResponse(
            reply=(
                "Handee offers verified professionals across all primary home trade categories in Sri Lanka:\n\n"
                "• ❄️ **AC Repair & Servicing**: Gas refilling, deep cleaning, cooling troubleshooting\n"
                "• 🚰 **Plumbing**: Leak repairs, pipe replacement, tap & bathroom fixtures\n"
                "• ⚡ **Electrical**: Circuit breaker repairs, switchboard maintenance, rewiring\n"
                "• 🔨 **Carpentry**: Furniture repairs, door lock fitting, custom woodwork\n"
                "• 🎨 **Painting**: Interior and exterior wall painting, waterproofing\n"
                "• 🧹 **Cleaning & Maintenance**: Deep home cleaning, sofa washing, general maintenance"
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "Find AC Repair specialists",
                "Find Plumber in Colombo",
                "Find Electricians",
                "Check pricing benchmarks"
            ])
        )

    # 11. Pricing Inquiries (General or Trade-Specific)
    if PRICING_INQUIRY_PATTERN.search(query):
        cat_result = classify_job_category(query)
        has_specific_trade = (not cat_result.is_ambiguous) and (cat_result.confidence >= 0.25)

        if has_specific_trade:
            trade_cat = cat_result.category
            benchmark = CATEGORY_BENCHMARKS.get(trade_cat, 3500.0)
            providers = await search_providers(trade_cat, "Colombo")
            listings = await search_service_listings(query, trade_cat)

            reply = (
                f"On Handee, standard **{trade_cat}** diagnostic inspections and basic repairs start around "
                f"a platform benchmark of **Rs. {int(benchmark):,}**.\n\n"
                f"Technicians provide an itemized quote before starting work, and your payment is securely "
                f"held in escrow until you approve the completed service. You can explore verified {trade_cat} "
                f"specialists and fixed-price listings below:"
            )
            return AssistantQueryResponse(
                reply=reply,
                category=trade_cat,
                suggested_providers=providers[:3],
                suggested_listings=listings[:2],
                suggestions=_sanitize_suggestions([
                    f"View {trade_cat} listings",
                    f"Verified {trade_cat} specialists",
                    "How does escrow payment work?",
                    "Check general pricing guide"
                ])
            )
        else:
            reply = (
                "Handee follows transparent, standardized pricing benchmarks across Sri Lanka:\n\n"
                "• 🚰 **Plumbing**: From Rs. 3,500 (diagnostic & minor repairs)\n"
                "• ⚡ **Electrical**: From Rs. 4,000 (wiring check & breaker fixes)\n"
                "• ❄️ **AC Repair**: From Rs. 5,000 (inspection & chemical service)\n"
                "• 🔨 **Carpentry**: From Rs. 4,500 (fitting & furniture repair)\n"
                "• 🎨 **Painting**: From Rs. 4,000 (wall prep & spot painting)\n"
                "• 🧹 **Cleaning / Maintenance**: From Rs. 3,000 – 3,500\n\n"
                "Every booking includes an upfront quote and escrow payment protection with zero hidden charges."
            )
            return AssistantQueryResponse(
                reply=reply,
                category="General",
                suggested_providers=[],
                suggested_listings=[],
                suggestions=_sanitize_suggestions([
                    "Check AC Repair rates",
                    "Check Plumbing rates",
                    "Check Electrical rates",
                    "How does escrow payment work?"
                ])
            )

    # 12. Trade Category Classification for Service Search / Job Requests
    cat_result = classify_job_category(query)
    is_trade_query = (not cat_result.is_ambiguous) and (cat_result.confidence >= 0.25)
    category = cat_result.category

    # If it is not a direct trade request (and didn't match the specific FAQ patterns above)
    if not is_trade_query:
        if llm:
            try:
                system_prompt = (
                    "You are the Handee AI Assistant for Handee, a verified on-demand trade service marketplace "
                    "(AC Repair, Plumbing, Electrical, Carpentry, Painting, Cleaning) in Sri Lanka. "
                    "Answer the user's question directly, concisely, and helpfully in 2-3 sentences. "
                    "If they need trade work, invite them to describe the issue or choose a trade category."
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
                            "Find AC Repair technicians",
                            "Plumbing repair in Colombo",
                            "Electrical safety check",
                            "Explore Service Listings"
                        ])
                    )
            except Exception as e:
                _record_llm_failure(e)

        # Smart guided fallback when query is generic or ambiguous
        return AssistantQueryResponse(
            reply=(
                "I'm here to assist you with Handee home trade services across Sri Lanka! You can ask me about:\n\n"
                "• **Trade Services**: Find verified specialists for AC Repair, Plumbing, Electrical, Carpentry, Painting, or Cleaning\n"
                "• **Pricing & Rates**: Check benchmark costs and rate estimates for any trade\n"
                "• **Platform Policies**: Learn how escrow payments work, provider NIC verification, or booking cancellations\n\n"
                "What would you like to know?"
            ),
            category="General",
            suggested_providers=[],
            suggested_listings=[],
            suggestions=_sanitize_suggestions([
                "Find AC Repair specialists",
                "Find Plumber in Colombo",
                "How does escrow payment work?",
                "Check Pricing Guide"
            ])
        )

    # 13. Specific Trade Request: query matching live providers and service listings
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
            _record_llm_failure(e)

    # Deterministic fallback when LLM is unavailable or in cooldown
    if not reply:
        if top_listing and top_listing.get("providerName"):
            reply = (
                f"I found verified {category} services on Handee! "
                f"Top service listing: **{top_listing['title']}** by **{top_listing['providerName']}** (Rs. {int(top_listing['price']):,}). "
                f"Standard platform benchmark pricing for {category} starts around Rs. {int(benchmark):,}. "
                f"You can review the service listing or technician profile below to see full details and book securely."
            )
        elif top_provider:
            prov_name = top_provider.get("fullName", "Verified Provider")
            prov_rating = top_provider.get("rating", 4.8)
            reply = (
                f"I found {len(providers)} verified {category} specialists available in your area. "
                f"Top recommendation: **{prov_name}** ({prov_rating}★). "
                f"Platform benchmark pricing for {category} typically starts around Rs. {int(benchmark):,}. "
                f"You can check their profile below to view qualifications and customer reviews."
            )
        else:
            reply = (
                f"We have qualified tradespeople covering {category}. "
                f"Standard pricing benchmarks for {category} start around Rs. {int(benchmark):,}."
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
