import re
from typing import Any, Dict, List, Optional

CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "Plumbing": [
        "leak", "pipe", "tap", "faucet", "drain", "clog", "toilet", "water",
        "sink", "flush", "plumber", "burst", "gutter", "shower", "sewage"
    ],
    "Electrical": [
        "wire", "wiring", "breaker", "fuse", "power", "switch", "socket",
        "light", "short circuit", "tripping", "fan", "inverter", "electrician"
    ],
    "AC Repair": [
        "ac", "air conditioner", "cooling", "filter", "gas leak", "compressor",
        "hvac", "remote", "condenser", "thermostat", "duct"
    ],
    "Carpentry": [
        "wood", "door", "window", "furniture", "table", "chair", "cabinet",
        "hinge", "lock", "shelf", "cupboard", "carpenter", "drawer"
    ],
    "Painting": [
        "paint", "color", "wall", "primer", "coat", "exterior", "interior",
        "plaster", "stain", "painter", "brush", "roller", "whitewash"
    ],
    "Masonry": [
        "brick", "cement", "tile", "grout", "crack", "mason", "concrete",
        "paving", "foundation", "slab", "masonry"
    ],
    "Appliance Repair": [
        "fridge", "refrigerator", "washing machine", "microwave", "oven",
        "blender", "iron", "cooker", "appliance", "dryer", "dishwasher"
    ],
    "Cleaning": [
        "clean", "deep clean", "mop", "sweep", "dust", "sanitization",
        "carpet cleaning", "disinfect", "maid", "janitor"
    ],
    "Roofing": [
        "roof", "ceiling", "tile", "leakage", "sheet", "asbestos", "rain leak",
        "guttering", "gutter repair"
    ],
}


def classify_job_category(
    description: str,
    pre_selected_category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Classifies customer job description into a domain trade category.
    Returns matched category, confidence score, and extracted keywords.
    """
    cleaned_desc = description.lower()
    scores: Dict[str, int] = {}
    matched_keywords_by_cat: Dict[str, List[str]] = {}

    for cat, keywords in CATEGORY_KEYWORDS.items():
        found = [kw for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', cleaned_desc)]
        if found:
            scores[cat] = len(found)
            matched_keywords_by_cat[cat] = found

    if pre_selected_category and pre_selected_category in CATEGORY_KEYWORDS:
        # Boost pre-selected category
        scores[pre_selected_category] = scores.get(pre_selected_category, 0) + 2

    if scores:
        best_cat = max(scores, key=scores.get)
        matched_kws = matched_keywords_by_cat.get(best_cat, [])
        confidence = min(1.0, 0.4 + (0.15 * len(matched_kws)))
        return {
            "category": best_cat,
            "confidence": round(confidence, 2),
            "matched_keywords": matched_kws,
            "is_ambiguous": len([s for s in scores.values() if s == scores[best_cat]]) > 1 and len(matched_kws) == 1
        }

    # Fallback to pre-selected category or General Maintenance
    fallback = pre_selected_category if pre_selected_category else "General Maintenance"
    return {
        "category": fallback,
        "confidence": 0.5 if pre_selected_category else 0.3,
        "matched_keywords": [],
        "is_ambiguous": True
    }


def estimate_scope(
    category: str,
    description: str,
    urgency: str = "normal"
) -> Dict[str, Any]:
    """
    Estimates complexity, duration, complexity flags, and price multiplier
    based on job description and urgency.
    """
    cleaned_desc = description.lower()
    
    high_complexity_terms = [
        "entire", "whole house", "replace all", "rewiring", "overhaul",
        "major", "heavy", "underground", "concrete", "structural", "burst"
    ]
    medium_complexity_terms = [
        "install", "fix", "repair", "motor", "leak", "pipe", "clogged",
        "not working", "broken", "service"
    ]
    
    has_high = any(term in cleaned_desc for term in high_complexity_terms)
    has_medium = any(term in cleaned_desc for term in medium_complexity_terms)

    urgency_norm = urgency.lower()
    is_emergency = urgency_norm in ["emergency", "high", "urgent"]

    if has_high:
        complexity = "High"
        duration_hours = 4.0
        multiplier = 1.8
    elif has_medium:
        complexity = "Medium"
        duration_hours = 2.0
        multiplier = 1.2
    else:
        complexity = "Low"
        duration_hours = 1.0
        multiplier = 1.0

    if is_emergency:
        multiplier *= 1.25

    return {
        "complexity": complexity,
        "estimated_duration_hours": duration_hours,
        "price_multiplier": round(multiplier, 2),
        "is_emergency": is_emergency,
        "ambiguity_flag": len(description.strip()) < 15,
        "summary": f"{complexity} complexity {category} job ({duration_hours}h estimated)"
    }
