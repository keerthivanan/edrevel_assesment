"""Pydantic models mirroring the provided JSON Schema contracts.

These models are the single source of truth for request/response shapes and are
intentionally faithful to:
  - available-content.schema.json  (GET /api/components)
  - learning-path.schema.json      (POST/GET /api/learning-paths)
"""
from __future__ import annotations

from typing import List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator


# --------------------------------------------------------------------------- #
# available-content.schema.json
# --------------------------------------------------------------------------- #
class AssessmentMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")
    maxScore: int = Field(ge=1, le=10000)
    passingScore: int = Field(ge=0, le=10000)


class UnitMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recommendedMinutes: Optional[int] = Field(default=None, ge=1, le=600)


class ComponentMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assessment: Optional[AssessmentMeta] = None
    unit: Optional[UnitMeta] = None


class Component(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=150)
    shortDescription: str = Field(min_length=1, max_length=280)
    type: Literal["unit", "assessment"]
    approximateDurationMinutes: int = Field(ge=1, le=600)
    metadata: Optional[ComponentMetadata] = None

    @model_validator(mode="after")
    def _require_assessment_meta(self) -> "Component":
        if self.type == "assessment":
            if not self.metadata or not self.metadata.assessment:
                raise ValueError("assessment components require metadata.assessment")
        return self


class ComponentsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: List[Component] = Field(min_length=1)
    totalCount: int = Field(ge=0)


# --------------------------------------------------------------------------- #
# learning-path.schema.json
# --------------------------------------------------------------------------- #
class Position(BaseModel):
    model_config = ConfigDict(extra="forbid")
    x: float
    y: float


class NodeAssessmentConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    maxScore: int = Field(ge=1, le=10000)
    passingScore: int = Field(ge=0, le=10000)


class NodeConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    approximateDurationMinutes: Optional[int] = Field(default=None, ge=0, le=600)
    assessment: Optional[NodeAssessmentConfig] = None


class Node(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=100)
    componentId: str = Field(min_length=1, max_length=100)
    type: Literal["start", "unit", "assessment", "end"]
    label: str = Field(min_length=1, max_length=150)
    description: Optional[str] = Field(default=None, max_length=1000)
    position: Position
    config: Optional[NodeConfig] = None


class Range(BaseModel):
    model_config = ConfigDict(extra="forbid")
    min: float
    max: float
    minInclusive: Optional[bool] = True
    maxInclusive: Optional[bool] = True


class Rule(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=100)
    sourceType: Literal["assessment", "unit"]
    sourceNodeId: str = Field(min_length=1, max_length=100)
    metric: Literal[
        "completion",
        "passed",
        "score",
        "score_range",
        "time_spent_minutes",
        "percentage_completion",
    ]
    operator: Literal["eq", "ne", "gt", "gte", "lt", "lte", "between"]
    value: Optional[Union[bool, float, str]] = None
    range: Optional[Range] = None

    @model_validator(mode="after")
    def _validate_rule(self) -> "Rule":
        if self.operator == "between" and self.range is None:
            raise ValueError("operator 'between' requires a range")
        if self.metric in ("completion", "passed"):
            if not isinstance(self.value, bool):
                raise ValueError(f"metric '{self.metric}' requires a boolean value")
        if self.metric in ("score", "time_spent_minutes", "percentage_completion"):
            if not isinstance(self.value, (int, float)) or isinstance(self.value, bool):
                raise ValueError(f"metric '{self.metric}' requires a numeric value")
        if self.metric == "score_range" and self.range is None:
            raise ValueError("metric 'score_range' requires a range")
        return self


class Conditions(BaseModel):
    model_config = ConfigDict(extra="forbid")
    operator: Literal["AND", "OR"]
    rules: List[Rule] = Field(default_factory=list)


class Edge(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=100)
    sourceNodeId: str = Field(min_length=1, max_length=100)
    targetNodeId: str = Field(min_length=1, max_length=100)
    label: Optional[str] = Field(default=None, max_length=150)
    priority: Optional[int] = Field(default=None, ge=1)
    isDefault: Optional[bool] = None
    conditions: Conditions


class Canvas(BaseModel):
    model_config = ConfigDict(extra="forbid")
    zoom: Optional[float] = Field(default=None, ge=0.1, le=4)
    offsetX: Optional[float] = None
    offsetY: Optional[float] = None


class LearningPath(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Optional[str] = Field(default=None, min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=150)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: Literal["draft", "published"]
    version: Optional[int] = Field(default=None, ge=1)
    canvas: Optional[Canvas] = None
    nodes: List[Node] = Field(min_length=2)
    edges: List[Edge] = Field(min_length=1)

    @model_validator(mode="after")
    def _validate_graph(self) -> "LearningPath":
        node_ids = {n.id for n in self.nodes}
        if len(node_ids) != len(self.nodes):
            raise ValueError("node ids must be unique")
        for e in self.edges:
            if e.sourceNodeId not in node_ids:
                raise ValueError(f"edge {e.id} references unknown source {e.sourceNodeId}")
            if e.targetNodeId not in node_ids:
                raise ValueError(f"edge {e.id} references unknown target {e.targetNodeId}")
        return self


# --------------------------------------------------------------------------- #
# Optional evaluate endpoint
# --------------------------------------------------------------------------- #
class LearnerContext(BaseModel):
    """Observed learner results keyed by node id."""
    model_config = ConfigDict(extra="forbid")
    currentNodeId: str
    results: dict[str, "NodeResult"] = Field(default_factory=dict)


class NodeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    completion: Optional[bool] = None
    passed: Optional[bool] = None
    score: Optional[float] = None
    timeSpentMinutes: Optional[float] = None
    percentageCompletion: Optional[float] = None


class EvaluateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nextNodeId: Optional[str]
    matchedEdgeId: Optional[str]
    reason: str


LearnerContext.model_rebuild()
