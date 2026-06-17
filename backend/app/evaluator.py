"""Adaptive routing engine.

Given a saved learning path and a learner's observed results, decide which edge
(and therefore which next node) the learner should be routed to.

Implements PDF section 7 (Conditional rule model): metrics completion / passed /
score / score_range / time_spent_minutes / percentage_completion, with operators
eq / ne / gt / gte / lt / lte / between, combined per edge by AND / OR.
"""
from __future__ import annotations

from typing import Optional

from .schemas import (
    EvaluateResponse,
    LearnerContext,
    LearningPath,
    NodeResult,
    Rule,
)

_METRIC_TO_FIELD = {
    "completion": "completion",
    "passed": "passed",
    "score": "score",
    "score_range": "score",
    "time_spent_minutes": "timeSpentMinutes",
    "percentage_completion": "percentageCompletion",
}


def _observed_value(result: Optional[NodeResult], metric: str):
    if result is None:
        return None
    return getattr(result, _METRIC_TO_FIELD[metric], None)


def _in_range(value: float, rule: Rule) -> bool:
    r = rule.range
    lo_ok = value >= r.min if (r.minInclusive is None or r.minInclusive) else value > r.min
    hi_ok = value <= r.max if (r.maxInclusive is None or r.maxInclusive) else value < r.max
    return lo_ok and hi_ok


def evaluate_rule(rule: Rule, results: dict[str, NodeResult]) -> bool:
    observed = _observed_value(results.get(rule.sourceNodeId), rule.metric)
    if observed is None:
        return False

    if rule.operator == "between" or rule.metric == "score_range":
        try:
            return _in_range(float(observed), rule)
        except (TypeError, ValueError):
            return False

    expected = rule.value
    if rule.operator == "eq":
        return observed == expected
    if rule.operator == "ne":
        return observed != expected

    # Numeric comparisons.
    try:
        a, b = float(observed), float(expected)
    except (TypeError, ValueError):
        return False
    return {
        "gt": a > b,
        "gte": a >= b,
        "lt": a < b,
        "lte": a <= b,
    }[rule.operator]


def evaluate_edge(conditions, results: dict[str, NodeResult]) -> bool:
    rules = conditions.rules
    if not rules:
        return True  # unconditional edge (e.g. start -> first node)
    outcomes = [evaluate_rule(r, results) for r in rules]
    return all(outcomes) if conditions.operator == "AND" else any(outcomes)


def evaluate_next(path: LearningPath, ctx: LearnerContext) -> EvaluateResponse:
    """Pick the next node from the current node, honouring edge priority.

    Edges leaving the current node are tried in priority order (lower number
    first; default edges last) and the first whose conditions pass wins.
    """
    outgoing = [e for e in path.edges if e.sourceNodeId == ctx.currentNodeId]
    if not outgoing:
        return EvaluateResponse(
            nextNodeId=None, matchedEdgeId=None,
            reason=f"No outgoing edges from '{ctx.currentNodeId}'.",
        )

    def sort_key(e):
        return (1 if e.isDefault else 0, e.priority if e.priority is not None else 10_000)

    conditional = sorted([e for e in outgoing if not e.isDefault], key=sort_key)
    defaults = [e for e in outgoing if e.isDefault]

    for edge in conditional + defaults:
        if evaluate_edge(edge.conditions, ctx.results):
            return EvaluateResponse(
                nextNodeId=edge.targetNodeId,
                matchedEdgeId=edge.id,
                reason=f"Matched edge '{edge.id}'"
                + (" (default)" if edge.isDefault else "") + ".",
            )

    return EvaluateResponse(
        nextNodeId=None, matchedEdgeId=None,
        reason="No outgoing edge conditions were satisfied.",
    )
