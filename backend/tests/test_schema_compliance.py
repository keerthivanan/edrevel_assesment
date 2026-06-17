"""Validate live API responses against the ORIGINAL provided JSON Schema files.

This proves the implementation honours the contract from PDF section 5/11, not
just our own Pydantic interpretation of it.
"""
import json
from pathlib import Path

import jsonschema

HERE = Path(__file__).parent
COMPONENTS_SCHEMA = json.loads((HERE / "available-content.schema.json").read_text("utf-8"))
PATH_SCHEMA = json.loads((HERE / "learning-path.schema.json").read_text("utf-8"))
EXAMPLE = json.loads((HERE / "learning-path.example.json").read_text("utf-8"))


def test_components_response_matches_provided_schema(client):
    body = client.get("/api/components").json()
    jsonschema.validate(body, COMPONENTS_SCHEMA)


def test_saved_path_matches_provided_schema(client):
    saved = client.post("/api/learning-paths", json=EXAMPLE).json()
    jsonschema.validate(saved, PATH_SCHEMA)

    loaded = client.get(f"/api/learning-paths/{saved['id']}").json()
    jsonschema.validate(loaded, PATH_SCHEMA)
