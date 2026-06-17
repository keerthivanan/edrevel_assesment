"""Endpoint tests covering the PDF section 5 API contract."""
import json
from pathlib import Path

EXAMPLE = json.loads((Path(__file__).parent / "learning-path.example.json").read_text("utf-8"))


def test_components_match_contract(client):
    r = client.get("/api/components")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"items", "totalCount"}
    assert body["totalCount"] == len(body["items"]) >= 1
    item = body["items"][0]
    for field in ("id", "title", "shortDescription", "type", "approximateDurationMinutes"):
        assert field in item
    assert item["type"] in ("unit", "assessment")
    # Assessment components must carry assessment metadata.
    for it in body["items"]:
        if it["type"] == "assessment":
            assert it["metadata"]["assessment"]["maxScore"] >= 1
            assert "passingScore" in it["metadata"]["assessment"]


def test_save_then_load_round_trips(client):
    r = client.post("/api/learning-paths", json=EXAMPLE)
    assert r.status_code == 201, r.text
    saved = r.json()
    path_id = saved["id"]

    r2 = client.get(f"/api/learning-paths/{path_id}")
    assert r2.status_code == 200
    loaded = r2.json()
    # Nodes, positions, labels and rules are all restored (PDF 3.F).
    assert len(loaded["nodes"]) == len(EXAMPLE["nodes"])
    assert len(loaded["edges"]) == len(EXAMPLE["edges"])
    src = {n["id"]: n for n in EXAMPLE["nodes"]}
    for n in loaded["nodes"]:
        assert n["position"] == src[n["id"]]["position"]
        assert n["label"] == src[n["id"]]["label"]


def test_save_generates_id_when_missing(client):
    payload = {k: v for k, v in EXAMPLE.items() if k != "id"}
    r = client.post("/api/learning-paths", json=payload)
    assert r.status_code == 201
    assert r.json()["id"].startswith("lp-")


def test_load_unknown_returns_404(client):
    assert client.get("/api/learning-paths/does-not-exist").status_code == 404


def test_invalid_payload_rejected(client):
    bad = {"name": "x", "status": "draft", "nodes": [], "edges": []}  # too few nodes
    assert client.post("/api/learning-paths", json=bad).status_code == 422


def test_edge_referencing_unknown_node_rejected(client):
    bad = json.loads(json.dumps(EXAMPLE))
    bad["edges"][0]["targetNodeId"] = "ghost-node"
    assert client.post("/api/learning-paths", json=bad).status_code == 422


def test_evaluate_routes_low_scorer_to_easy(client):
    path_id = client.post("/api/learning-paths", json=EXAMPLE).json()["id"]
    ctx = {
        "currentNodeId": "node-math-1",
        "results": {"node-math-1": {"completion": True, "passed": False, "score": 30}},
    }
    r = client.post(f"/api/learning-paths/{path_id}/evaluate", json=ctx)
    assert r.status_code == 200
    assert r.json()["nextNodeId"] == "node-math-2-easy"


def test_evaluate_routes_passer_to_advanced(client):
    path_id = client.post("/api/learning-paths", json=EXAMPLE).json()["id"]
    ctx = {
        "currentNodeId": "node-math-1",
        "results": {"node-math-1": {"completion": True, "passed": True, "score": 80}},
    }
    r = client.post(f"/api/learning-paths/{path_id}/evaluate", json=ctx)
    assert r.json()["nextNodeId"] == "node-math-2-advanced"
