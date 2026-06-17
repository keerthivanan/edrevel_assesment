"""Unit tests for the conditional routing engine (PDF section 7)."""
from app.evaluator import evaluate_edge, evaluate_rule
from app.schemas import Conditions, NodeResult, Range, Rule


def _results(**kw) -> dict[str, NodeResult]:
    return {"n1": NodeResult(**kw)}


def test_completion_boolean():
    rule = Rule(id="r", sourceType="assessment", sourceNodeId="n1",
                metric="completion", operator="eq", value=True)
    assert evaluate_rule(rule, _results(completion=True)) is True
    assert evaluate_rule(rule, _results(completion=False)) is False


def test_passed_boolean():
    rule = Rule(id="r", sourceType="assessment", sourceNodeId="n1",
                metric="passed", operator="eq", value=True)
    assert evaluate_rule(rule, _results(passed=True)) is True


def test_score_gte():
    rule = Rule(id="r", sourceType="assessment", sourceNodeId="n1",
                metric="score", operator="gte", value=50)
    assert evaluate_rule(rule, _results(score=50)) is True
    assert evaluate_rule(rule, _results(score=49)) is False


def test_score_range_between_inclusive():
    rule = Rule(id="r", sourceType="assessment", sourceNodeId="n1",
                metric="score_range", operator="between",
                range=Range(min=0, max=49, minInclusive=True, maxInclusive=True))
    assert evaluate_rule(rule, _results(score=0)) is True
    assert evaluate_rule(rule, _results(score=49)) is True
    assert evaluate_rule(rule, _results(score=50)) is False


def test_percentage_completion_unit():
    rule = Rule(id="r", sourceType="unit", sourceNodeId="n1",
                metric="percentage_completion", operator="gte", value=80)
    assert evaluate_rule(rule, _results(percentageCompletion=85)) is True
    assert evaluate_rule(rule, _results(percentageCompletion=70)) is False


def test_time_spent_minutes_unit():
    rule = Rule(id="r", sourceType="unit", sourceNodeId="n1",
                metric="time_spent_minutes", operator="gte", value=30)
    assert evaluate_rule(rule, _results(timeSpentMinutes=45)) is True


def test_missing_observation_is_false():
    rule = Rule(id="r", sourceType="assessment", sourceNodeId="n1",
                metric="score", operator="gte", value=50)
    assert evaluate_rule(rule, {}) is False


def test_and_requires_all_rules():
    conds = Conditions(operator="AND", rules=[
        Rule(id="a", sourceType="assessment", sourceNodeId="n1",
             metric="completion", operator="eq", value=True),
        Rule(id="b", sourceType="assessment", sourceNodeId="n1",
             metric="score", operator="gte", value=50),
    ])
    assert evaluate_edge(conds, _results(completion=True, score=60)) is True
    assert evaluate_edge(conds, _results(completion=True, score=40)) is False


def test_or_requires_any_rule():
    conds = Conditions(operator="OR", rules=[
        Rule(id="a", sourceType="assessment", sourceNodeId="n1",
             metric="passed", operator="eq", value=True),
        Rule(id="b", sourceType="assessment", sourceNodeId="n1",
             metric="score", operator="gte", value=90),
    ])
    assert evaluate_edge(conds, _results(passed=False, score=95)) is True
    assert evaluate_edge(conds, _results(passed=False, score=10)) is False


def test_empty_rules_is_unconditional():
    assert evaluate_edge(Conditions(operator="AND", rules=[]), {}) is True
