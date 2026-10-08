"""Mark scale conversion.

A course assessment has a *reported* maximum (what students see - e.g. a CA
out of 30) and optionally a *marking scale* (what the lecturer actually marks
on - e.g. 20). Raw marks are stored as entered; the reported mark is derived so
the lecturer's original entry is never lost.
"""
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

TWO_PLACES = Decimal("0.01")


def marking_scale(assessment):
    """The scale marks are entered on. Falls back to the reported maximum."""
    raw = getattr(assessment, "raw_maximum", None)
    if raw is None:
        return assessment.maximum_score
    try:
        raw = Decimal(str(raw))
    except (InvalidOperation, TypeError):
        return assessment.maximum_score
    return raw if raw > 0 else assessment.maximum_score


def is_converted(assessment):
    """True when the marking scale differs from the reported maximum."""
    return marking_scale(assessment) != assessment.maximum_score


def to_reported(score, assessment):
    """Convert a raw mark onto the reported scale (e.g. 18/20 -> 27/30).

    Returns None when there is nothing to convert. Rounded to 2dp, half-up.
    """
    if score is None:
        return None
    try:
        score = Decimal(str(score))
        reported_max = Decimal(str(assessment.maximum_score))
        raw_max = marking_scale(assessment)
    except (InvalidOperation, TypeError):
        return None
    if raw_max <= 0 or reported_max <= 0:
        return None
    if raw_max == reported_max:
        return score.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    converted = (score * reported_max) / raw_max
    return converted.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def _weight_of(assessment):
    try:
        w = assessment.group_weight
        return Decimal(str(w)) if w is not None else None
    except (InvalidOperation, TypeError):
        return None


def group_shares(group):
    """Fraction of the group grade carried by each member assessment.

    Explicit weights are used when every member has one (normalised to sum 1).
    Otherwise the group is split evenly. Returns {assessment_id: Decimal share}.
    """
    members = list(group.assessments.all())
    if not members:
        return {}
    weights = {m.id: _weight_of(m) for m in members}
    have_all = all(w is not None and w > 0 for w in weights.values())
    if have_all:
        total = sum(weights.values())
        if total > 0:
            return {mid: (w / total) for mid, w in weights.items()}
    even = (Decimal(1) / Decimal(len(members))).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
    return {m.id: even for m in members}


def contribution(group, share):
    """The most this member can contribute to the combined grade."""
    if share is None:
        return None
    return (Decimal(str(group.maximum_score)) * share).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def group_score(assessment, group, share, raw_score):
    """A student's contribution to the combined group grade.

    raw_score is what the lecturer typed on their own marking scale. It is
    treated as a fraction achieved, then applied to the slice of the group
    maximum this member carries - so members marked on different scales
    combine fairly and a perfect mark everywhere yields the full group max.
    """
    if raw_score is None or share is None:
        return None
    try:
        raw = Decimal(str(raw_score))
        scale = marking_scale(assessment)
        group_max = Decimal(str(group.maximum_score))
    except (InvalidOperation, TypeError):
        return None
    if scale <= 0 or group_max <= 0:
        return None
    fraction = raw / scale
    return (fraction * group_max * share).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def group_grade(raw_marks_by_assessment, group):
    """Combined grade for one student.

    raw_marks_by_assessment: {assessment_id: raw score as entered or None}
    Returns (total, breakdown).
    """
    shares = group_shares(group)
    total = Decimal(0)
    breakdown = []
    any_score = False
    for assessment in group.assessments.all():
        share = shares.get(assessment.id)
        raw = raw_marks_by_assessment.get(assessment.id)
        part = group_score(assessment, group, share, raw)
        breakdown.append({
            "assessment_id": assessment.id,
            "title": assessment.title,
            "share": share,
            "share_percent": (share * 100).quantize(TWO_PLACES) if share is not None else None,
            "contributes_out_of": contribution(group, share),
            "raw_score": raw,
            "marking_scale": marking_scale(assessment),
            "reported_score": to_reported(raw, assessment),
            "points": part,
        })
        if part is not None:
            any_score = True
            total += part
    return (total.quantize(TWO_PLACES, rounding=ROUND_HALF_UP) if any_score else None), breakdown
