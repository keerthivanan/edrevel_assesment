"""Pytest fixtures: isolate each test run against a fresh temp SQLite DB."""
import os
import tempfile
from pathlib import Path

import pytest

# Point the app at a throwaway database BEFORE importing the app modules.
_tmp = Path(tempfile.mkdtemp()) / "test_app.db"
os.environ["ALPB_DB_PATH"] = str(_tmp)


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    from app import database as db
    from app.main import app

    # Rebuild a clean schema for every test for full isolation.
    db.Base.metadata.drop_all(db.engine)
    db.init_db(seed=True)
    with TestClient(app) as c:
        yield c
