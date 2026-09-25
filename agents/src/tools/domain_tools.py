"""Domain Analysis Agent tools: trade classification and scope estimation.

Both are deterministic keyword heuristics (no model call). They share one
matcher, so "whole word" means the same thing in both, and both validate
their arguments through the Pydantic contracts in src.schemas.contracts.
"""

import re
from collections.abc import Sequence
from typing import Dict, FrozenSet, List, Optional, Tuple

from src.schemas.contracts import (
    FALLBACK_CATEGORY,
    SERVICE_CATEGORIES,
    ClassifyJobCategoryInput,
    ClassifyJobCategoryOutput,
    EstimateScopeInput,
    EstimateScopeOutput,
    JobUrgency,
    canonical_category,
)

# ─── Matching ────────────────────────────────────────────────────────────────
# Text is lower-cased, split into letter-only tokens, and each token loses one
# common inflection (-ing, -ed, -es, -s). Keywords are matched as whole token
# sequences, so "prefix" never matches "fix" while "leaking" matches "leak".

_WORD = re.compile(r"[a-z]+")
_SIBILANT_ENDINGS = ("ch", "sh", "x", "ss", "z")

Keyword = Tuple[str, Tuple[FrozenSet[str], ...]]  # (label, accepted forms per word)


def _undouble(base: str) -> str:
    # "clogg" -> "clog", "tripp" -> "trip"; "fill", "dress", "buzz" keep theirs.
    if len(base) >= 4 and base[-1] == base[-2] and base[-1] not in "lsz":
        return base[:-1]
    return base


def _stem(word: str) -> str:
    """Strip one inflection so forms meet: leak/leaks/leaked/leaking -> leak.

    Length guards keep short words intact ("need", "gas", "thing", "this").
    """
    if word.endswith("ing") and len(word) >= 6:
        return _undouble(word[:-3])
    if word.endswith("ed") and len(word) >= 5:
        return _undouble(word[:-2])
    if word.endswith("es") and word[:-2].endswith(_SIBILANT_ENDINGS) and len(word) >= 5:
        return word[:-2]  # switches -> switch
    if word.endswith("s") and not word.endswith(("ss", "us", "is")) and len(word) >= 4:
        return word[:-1]  # pipes -> pipe, but glass/status/this stay
    return word


def _normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"n['’]t\b", " not", text)  # "isn't working" -> "is not working"
    return re.sub(r"\ba\s*/\s*c\b", "ac", text)  # "a/c" -> "ac"


def _tokens(text: str) -> List[str]:
    return [_stem(w) for w in _WORD.findall(_normalize(text))]


def _word_forms(word: str) -> FrozenSet[str]:
    # Stemming drops a silent "e" with -ing/-ed ("wiring" -> "wir"), so a
    # keyword ending in "e" also accepts that form. Only keywords get this,
    # so "tape" in the text never matches the keyword "tap".
    stem = _stem(word)
    forms = {word, stem}
    if stem.endswith("e") and len(stem) >= 4:
        forms.add(stem[:-1])
    return frozenset(forms)


def _compile(keywords: Sequence[str]) -> List[Keyword]:
    return [(kw, tuple(_word_forms(w) for w in kw.split())) for kw in keywords]


def _matched(tokens: List[str], keywords: List[Keyword]) -> List[str]:
    """Labels of the keywords that occur in tokens as a contiguous run."""
    found = []
    for label, forms in keywords:
        n = len(forms)
        if any(
            all(tokens[i + j] in forms[j] for j in range(n)) for i in range(len(tokens) - n + 1)
        ):
            found.append(label)
    return found


# ─── classify_job_category ───────────────────────────────────────────────────
# One keyword list per real ServiceCategory. Lists hold base forms only (one
# entry per word; "wire" already covers wires/wired/wiring), so a single word
# in the text can't count twice. Jobs for trades the backend doesn't have
# (carpentry, masonry, roofing) fall under General Maintenance.

_CATEGORY_KEYWORDS: Dict[str, List[Keyword]] = {
    "Plumbing": _compile([
        "leak", "leaky", "pipe", "tap", "faucet", "drain", "clog", "blockage", "toilet",
        "sink", "flush", "cistern", "basin", "shower", "sewage", "sewer", "plumber",
        "plumbing", "burst", "valve", "water tank",
    ]),
    "Electrical": _compile([
        "wire", "rewire", "breaker", "fuse", "power", "switch", "switchboard", "socket",
        "plug", "light", "bulb", "short circuit", "trip", "electrician", "electrical",
        "electricity", "voltage", "inverter", "generator", "fan", "spark", "shock",
    ]),
    "AC Repair": _compile([
        "ac", "air conditioner", "air conditioning", "aircon", "cool", "compressor",
        "condenser", "thermostat", "hvac", "refrigerant", "gas refill", "split unit", "duct",
    ]),
    "Painting": _compile([
        "paint", "painter", "repaint", "primer", "whitewash", "emulsion", "varnish",
        "putty", "colour", "color", "coat",
    ]),
    "General Maintenance": _compile([
        "handyman", "maintenance", "door", "window", "hinge", "lock", "furniture", "shelf",
        "cabinet", "cupboard", "drawer", "curtain", "tile", "grout", "crack", "roof",
        "gutter", "fence", "gate", "assemble", "mount",
    ]),
    "Cleaning": _compile([
        "clean", "cleaner", "mop", "sweep", "dust", "vacuum", "sanitize", "sanitise",
        "disinfect", "maid", "janitor", "housekeeping", "stain", "carpet", "sofa",
        "upholstery", "mould", "mold",
    ]),
}

# The customer's own pick counts as one extra keyword's worth of evidence.
PRESELECTED_BOOST = 1

# Below anything keyword-backed can produce: the weakest real result is a 1–1
# tie, which scores (1 - 0.5) * 0.5 = 0.25.
FALLBACK_CONFIDENCE = 0.1


def _confidence(top: int, runner_up: int) -> float:
    """How sure the winner is, from its evidence and its lead.

    strength saturates with evidence: 1 keyword 0.5, 2 -> 0.75, 3 -> 0.875.
    The lead factor keeps a clear win at full strength and halves a tie, so
    "3 vs 0" is more certain than "3 vs 2" even though both have 3 keywords.
    """
    strength = 1 - 0.5**top
    lead = (top - runner_up) / top
    return strength * (0.5 + 0.5 * lead)


def classify_job_category(
    description: str, pre_selected_category: Optional[str] = None
) -> ClassifyJobCategoryOutput:
    """Classifies a job description into one of the real ServiceCategory names.

    Rules:
    - Score = distinct keywords matched, plus PRESELECTED_BOOST for the
      customer's pre-selected category (matched case-insensitively; unknown
      names are ignored).
    - No keyword matched anywhere: the pre-selected category if it's one of
      the real six, otherwise FALLBACK_CATEGORY; either way ambiguous, at
      FALLBACK_CONFIDENCE.
    - Two or more categories sharing the top score is ambiguous. The tie goes
      to the pre-selected category if it's among them, otherwise to the first
      in SERVICE_CATEGORIES (the backend seeder's order).
    - matched_keywords lists the winner's text evidence only, not the boost.

    Raises pydantic.ValidationError for a missing, blank or non-string description.
    """
    params = ClassifyJobCategoryInput(
        description=description, pre_selected_category=pre_selected_category
    )
    tokens = _tokens(params.description)
    matched = {cat: _matched(tokens, kws) for cat, kws in _CATEGORY_KEYWORDS.items()}
    preferred = canonical_category(params.pre_selected_category)

    if not any(matched.values()):
        # No text evidence either way: keep the customer's own real category
        # rather than overriding it with a guess, but flag it.
        return ClassifyJobCategoryOutput(
            category=preferred or FALLBACK_CATEGORY,
            confidence=FALLBACK_CONFIDENCE,
            matched_keywords=[],
            is_ambiguous=True,
        )

    scores = {
        cat: len(found) + (PRESELECTED_BOOST if cat == preferred else 0)
        for cat, found in matched.items()
    }
    top = max(scores.values())
    leaders = [cat for cat in SERVICE_CATEGORIES if scores[cat] == top]
    category = preferred if preferred in leaders else leaders[0]
    runner_up = max((s for cat, s in scores.items() if cat != category), default=0)

    return ClassifyJobCategoryOutput(
        category=category,
        confidence=round(_confidence(top, runner_up), 2),
        matched_keywords=matched[category],
        is_ambiguous=len(leaders) > 1,
    )


# ─── estimate_scope ──────────────────────────────────────────────────────────

# (tier, price multiplier, estimated hours). The numbers are the previous
# implementation's calibration, carried over unchanged.
_COMPLEXITY_LADDER: Tuple[Tuple[str, float, float], ...] = (
    ("Low", 1.0, 1.0),
    ("Medium", 1.2, 2.0),
    ("High", 1.8, 4.0),
)

_HIGH_TERMS = _compile([
    "entire", "whole house", "whole home", "whole building", "full house", "all room",
    "replace all", "rewire", "overhaul", "major", "structural", "underground", "burst",
    "flood", "renovate", "renovation",
])
_MEDIUM_TERMS = _compile([
    "install", "installation", "fix", "repair", "replace", "replacement", "leak", "broken",
    "not work", "stop work", "fault", "faulty", "damage", "service", "motor", "clog",
    "trip", "short circuit",
])
_LOW_TERMS = _compile([
    "small", "minor", "simple", "quick", "little", "tiny", "basic", "single", "touch up",
])

# Emergency keeps the previous 1.25 premium. High used to be folded into it;
# it's a distinct backend level, so it now gets its own smaller premium. Low
# isn't discounted: a flexible schedule doesn't make the work smaller.
_URGENCY_FACTOR: Dict[JobUrgency, float] = {
    JobUrgency.LOW: 1.0,
    JobUrgency.MEDIUM: 1.0,
    JobUrgency.HIGH: 1.1,
    JobUrgency.EMERGENCY: 1.25,
}

# Fewer content words than this can't describe how big a job is.
MIN_CONTENT_WORDS = 3
_FILLER_WORDS = frozenset(
    "a an the is are was were be been am to of in on at by for with from and or but "
    "my our your it its this that these those i we you me us they them there here "
    "please need needs needed want wants help some any get have has do does did not no "
    "can could would should will just very so also".split()
)


def _content_word_count(text: str) -> int:
    return sum(
        1
        for w in _WORD.findall(_normalize(text))
        if len(w) > 1 and w not in _FILLER_WORDS and _stem(w) not in _FILLER_WORDS
    )


def estimate_scope(
    category: str,
    description: str,
    urgency: Optional[str] = None,  # JobUrgency value, any casing; a JobUrgency is a str too
    category_is_ambiguous: bool = False,
) -> EstimateScopeOutput:
    """Estimates job size and a price multiplier range.

    Complexity: High if any high-complexity term matches, else Medium if any
    medium term does, else Low. Duration and base multiplier come from
    _COMPLEXITY_LADDER; urgency then scales the multiplier by _URGENCY_FACTOR.
    None means unspecified and takes the backend default (Medium).

    Price range. There are two independent reasons to doubt the estimate:
      1. the classifier flagged the trade as ambiguous (category_is_ambiguous);
      2. this function's own read is inconclusive — the description is too
         short, matches no complexity term at all (Low by default rather than
         by evidence), or has both high and low signals ("minor burst").
    Each reason present widens the range by one ladder tier in each direction,
    clamped to the ladder: we can't pin the job to one tier, so the quote spans
    the neighbouring ones. With neither, min == max. The ladder has nothing
    above High, so ambiguity can only widen a High estimate downward.

    category doesn't change the numbers: category-specific base prices live in
    action_tools.CATEGORY_BENCHMARKS and are applied by estimate_price. Here it
    is validated against the real categories and used in the summary only.

    Raises pydantic.ValidationError for a blank/non-string description, an
    unknown category, or an urgency that isn't a JobUrgency value.
    """
    params = EstimateScopeInput(
        category=category,
        description=description,
        urgency=urgency,
        category_is_ambiguous=category_is_ambiguous,
    )
    tokens = _tokens(params.description)
    high = _matched(tokens, _HIGH_TERMS)
    medium = _matched(tokens, _MEDIUM_TERMS)
    low = _matched(tokens, _LOW_TERMS)
    tier = 2 if high else 1 if medium else 0

    scope_reasons = []
    if _content_word_count(params.description) < MIN_CONTENT_WORDS:
        scope_reasons.append("description too short to judge the job's size")
    if not (high or medium or low):
        scope_reasons.append("no complexity signal in the description")
    if high and low:
        scope_reasons.append(f"conflicting size signals ({high[0]!r} vs {low[0]!r})")

    reasons = (["trade category is ambiguous"] if params.category_is_ambiguous else [])
    reasons += scope_reasons
    spread = int(params.category_is_ambiguous) + int(bool(scope_reasons))

    factor = _URGENCY_FACTOR[params.urgency]
    name, _, hours = _COMPLEXITY_LADDER[tier]
    low_tier = _COMPLEXITY_LADDER[max(0, tier - spread)]
    high_tier = _COMPLEXITY_LADDER[min(len(_COMPLEXITY_LADDER) - 1, tier + spread)]
    multiplier_min = round(low_tier[1] * factor, 2)
    multiplier_max = round(high_tier[1] * factor, 2)

    summary = f"{name} complexity {params.category} job, about {hours:g}h; price multiplier "
    if reasons:
        summary += f"{multiplier_min:g}-{multiplier_max:g} (widened: {'; '.join(reasons)})"
    else:
        summary += f"{multiplier_min:g}"

    return EstimateScopeOutput(
        complexity=name,
        estimated_duration_hours=hours,
        price_multiplier_min=multiplier_min,
        price_multiplier_max=multiplier_max,
        is_emergency=params.urgency is JobUrgency.EMERGENCY,
        ambiguity_flag=bool(reasons),
        ambiguity_reasons=reasons,
        summary=summary,
    )
