"""FastAPI application exposing the Adaptive Learning Path Builder API.

Implements the contract from PDF section 5:
  GET  /api/components                       -> available-content.schema.json
  POST /api/learning-paths                   -> learning-path.schema.json (save)
  GET  /api/learning-paths/{id}              -> learning-path.schema.json (load)
  POST /api/learning-paths/{id}/evaluate     -> optional adaptive routing
"""
from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import database as db
from .evaluator import evaluate_next
from .schemas import (
    ComponentsResponse,
    EvaluateResponse,
    LearnerContext,
    LearningPath,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db(seed=True)
    yield


app = FastAPI(
    title="Adaptive Learning Path Builder API",
    version="1.0.0",
    description="Contract-faithful API for building and replaying adaptive learning paths.",
    lifespan=lifespan,
)

# Allow the Vite dev server (and any localhost port) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/components", response_model=ComponentsResponse, response_model_exclude_none=True)
def get_components() -> ComponentsResponse:
    """Return all draggable content for the left-side panel (PDF 3.A / 6)."""
    items = db.get_components()
    return ComponentsResponse(items=items, totalCount=len(items))


@app.post(
    "/api/learning-paths",
    response_model=LearningPath,
    response_model_exclude_none=True,
    status_code=201,
)
def save_learning_path(path: LearningPath) -> LearningPath:
    """Save a learning path built on the canvas (PDF 3.F / 5)."""
    path_id = path.id or f"lp-{uuid.uuid4().hex[:12]}"
    version = (path.version or 0) + 1 if path.version else 1
    stored = path.model_copy(update={"id": path_id, "version": version})
    db.save_learning_path(path_id, version, stored.model_dump(exclude_none=True))
    return stored


@app.get("/api/learning-paths/{path_id}", response_model=LearningPath, response_model_exclude_none=True)
def load_learning_path(path_id: str) -> LearningPath:
    """Load a saved learning path, restoring nodes, positions, labels, rules."""
    data = db.load_learning_path(path_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Learning path '{path_id}' not found")
    return LearningPath(**data)


@app.post("/api/learning-paths/{path_id}/evaluate", response_model=EvaluateResponse)
def evaluate_learning_path(path_id: str, ctx: LearnerContext) -> EvaluateResponse:
    """Optional: evaluate the next node for a learner context (PDF 5 / 7)."""
    data = db.load_learning_path(path_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Learning path '{path_id}' not found")
    return evaluate_next(LearningPath(**data), ctx)
