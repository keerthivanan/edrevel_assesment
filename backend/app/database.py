"""SQLite persistence layer using SQLAlchemy 2.0.

The learning-path graph (nodes, edges, positions, rules) is stored as a JSON
document in a single row. This keeps the graph atomic and round-trips the exact
contract shape, while still being real database persistence (not an in-memory
dict). Components are seeded into their own table from the provided example file.

Satisfies PDF section 3.F (Save and reload) and section 4 (Persistence: SQLite).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

from sqlalchemy import JSON, Integer, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

DATA_DIR = Path(__file__).parent / "data"
# DB location is overridable (used by the test suite for an isolated database).
DB_PATH = Path(os.environ.get("ALPB_DB_PATH", DATA_DIR / "app.db"))
SEED_PATH = DATA_DIR / "available-content.seed.json"

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)


class Base(DeclarativeBase):
    pass


class ComponentRow(Base):
    __tablename__ = "components"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)


class LearningPathRow(Base):
    __tablename__ = "learning_paths"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    data: Mapped[dict] = mapped_column(JSON)


def init_db(seed: bool = True) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    if seed:
        seed_components()


def seed_components() -> None:
    """Load components from the provided example JSON if the table is empty."""
    with Session(engine) as session:
        if session.scalars(select(ComponentRow)).first():
            return
        if not SEED_PATH.exists():
            return
        payload = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        for item in payload.get("items", []):
            session.add(ComponentRow(id=item["id"], data=item))
        session.commit()


def get_components() -> list[dict]:
    with Session(engine) as session:
        rows = session.scalars(select(ComponentRow)).all()
        return [r.data for r in rows]


def save_learning_path(path_id: str, version: int, data: dict) -> None:
    with Session(engine) as session:
        row = session.get(LearningPathRow, path_id)
        if row is None:
            session.add(LearningPathRow(id=path_id, version=version, data=data))
        else:
            row.version = version
            row.data = data
        session.commit()


def load_learning_path(path_id: str) -> Optional[dict]:
    with Session(engine) as session:
        row = session.get(LearningPathRow, path_id)
        return row.data if row else None
