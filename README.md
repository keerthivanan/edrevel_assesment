# Adaptive Learning Path Builder

A full-stack web app for curriculum designers to build **adaptive learning paths**: drag content
onto a canvas, connect nodes into linear or branching flows, and attach conditional progression
rules (e.g. *score between 0–49 → Easy module*, *passed → Advanced module*).

Built for the Full-Stack Developer Assessment. The implementation follows the provided JSON Schema
files as the API contract and keeps the builder UI close to the supplied mockup.

| Layer | Technology |
|-------|-----------|
| Frontend | **React 18 + TypeScript** (Vite dev/build tool), **React Flow** for the node/edge canvas, **Zustand** for state |
| Backend | **Python + FastAPI**, Pydantic v2 for contract-faithful validation |
| Persistence | **SQLite** (via SQLAlchemy 2.0) |
| Tests | **pytest** (backend, 20 tests) · **Vitest** + Testing Library (frontend, 8 tests) |

> **Note on libraries (per assessment §4):** React Flow handles node rendering, repositioning,
> connector drawing, panning/zoom and the minimap. Zustand is a tiny state container. On the
> backend, FastAPI + Pydantic give the contract validation for free, and `jsonschema` is used in
> tests to validate live responses against the *original* provided schema files.

---

## Repository layout

```
adaptive-learning-path-builder/
├── README.md
├── available-content.schema.json      # provided contract (copied for reference)
├── learning-path.schema.json          # provided contract (copied for reference)
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app + 4 endpoints
│   │   ├── schemas.py                  # Pydantic models mirroring the JSON Schemas
│   │   ├── database.py                 # SQLite persistence + seed loader
│   │   ├── evaluator.py                # adaptive routing engine (conditional rules)
│   │   └── data/
│   │       └── available-content.seed.json   # seed content for the left panel
│   ├── tests/                          # pytest: api, evaluator, schema-compliance
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx, main.tsx, styles.css
    │   ├── store.ts                    # Zustand builder store
    │   ├── graph.ts                    # contract <-> React Flow adapters
    │   ├── types.ts                    # TS types mirroring the contract
    │   ├── api/client.ts               # API client
    │   └── components/                 # Toolbar, ComponentPalette, Canvas, ContentNode,
    │                                     ConditionalEdge, PropertiesPanel
    └── package.json
```

---

## Getting started

### 1. Backend (Python 3.10+)

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API root: <http://localhost:8000>
- Interactive docs (Swagger): <http://localhost:8000/docs>
- On first start the SQLite database (`backend/app/data/app.db`) is created and seeded from
  `available-content.seed.json` (8 components). The DB file is git-ignored.

### 2. Frontend (Node 18+)

```bash
cd frontend
npm install
npm run dev
```

- App: <http://localhost:5173>
- The Vite dev server proxies `/api/*` to `http://localhost:8000`, so run the backend first.

### 3. Try it

1. Drag items from the left **Add Components** panel onto the canvas.
2. Drag from a node's bottom handle to another node's top handle to create a connection.
3. Click a node → edit its label / duration / scores on the right.
4. Click a connection → set **Assignment Conditions** (AND/OR + rules) on the right.
5. **Save Draft** / **Publish** persists the path; copy the returned `id` into the *Load* box to
   reload it and confirm nodes, positions, labels and rules are restored.

To load the bundled SAT example directly: `POST` it once, then load by its id `lp-sat-adaptive-001`.

---

## API contract (assessment §5)

| Method | Endpoint | Purpose | Schema |
|--------|----------|---------|--------|
| GET  | `/api/components` | Content for the left panel | `available-content.schema.json` |
| POST | `/api/learning-paths` | Save a learning path | `learning-path.schema.json` |
| GET  | `/api/learning-paths/{id}` | Load a saved path | `learning-path.schema.json` |
| POST | `/api/learning-paths/{id}/evaluate` | *(optional)* next-node routing for a learner | — |

### Conditional rule model (assessment §7)

Each edge has `conditions = { operator: AND | OR, rules: [...] }`. A rule references a source node and
a metric:

| Source type | Metrics | Operators |
|-------------|---------|-----------|
| assessment | `completion`, `passed`, `score`, `score_range` | `eq, ne, gt, gte, lt, lte, between` |
| unit | `completion`, `time_spent_minutes`, `percentage_completion` | `eq, ne, gt, gte, lt, lte` |

The `/evaluate` engine tries an edge's outgoing connections in priority order (default edges last)
and returns the first whose conditions are satisfied for the learner context.

---

## Testing

### Backend — `cd backend && pytest -q`

```
20 passed
```

Covers: components contract, save→load round-trip (positions/labels/rules restored), id generation,
404s, invalid-payload rejection (422), edges referencing unknown nodes, the routing engine for every
metric/operator (AND/OR, score_range/between), and **schema-compliance** of live responses against the
original provided schema files.

### Frontend — `cd frontend && npm test`

```
Test Files  2 passed (2)
     Tests  8 passed (8)
```

Covers: contract ↔ React Flow adapters (round-trip preserves positions/labels/rules; conditional edges
animate), and the Zustand store (add node from component, create conditional edge on connect, add/update/
remove rules, AND/OR toggle, cascade-delete of a node's edges).

### Production build (type-check) — `cd frontend && npm run build`

```
✓ tsc -b && vite build — 0 type errors
```

---

## Submission checklist (assessment §9)

1. **Repository link** — initialise/push this folder: `git remote add origin <your-repo>` then `git push`.
   (A local git history is already committed.)
2. **Time spent** — ~1 working day.
3. **Assumptions & tradeoffs** — see below.
4. **Setup instructions** — see *Getting started*.
5. **Test execution evidence** — see *Testing* (20 backend + 8 frontend passing; build clean).

---

## Assumptions & tradeoffs

- **Graph stored as a JSON document in SQLite.** The whole path (nodes/edges/positions/rules) is saved
  atomically in one row keyed by id. This round-trips the exact contract shape and is simple to reason
  about. A fully normalised schema (separate node/edge/rule tables) would enable cross-path querying but
  adds mapping code with no benefit for this scope.
- **Saving bumps `version`** server-side and generates an `id` (`lp-...`) when one is not supplied; an
  existing id is upserted.
- **`start`/`end` nodes** use synthetic component ids (`system-start`/`system-end`) as in the provided
  example. The palette seeds real `unit`/`assessment` content; start/end come from the loaded path.
- **Edge routing** honours `priority` (lower first) and treats `isDefault` edges as the last resort, so a
  branch always has a deterministic fallback.
- **Validation is enforced both ways:** Pydantic rejects malformed payloads on write, and tests
  additionally validate responses against the *original* JSON Schema files to guarantee contract fidelity.
- **CORS is open** (`*`) for local development convenience; tighten for production.
