// Thin API client for the four backend endpoints (PDF section 5).
import type { ComponentsResponse, LearningPath } from "../types";

const BASE = "/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = JSON.stringify((await res.json()).detail ?? detail);
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchComponents(): Promise<ComponentsResponse> {
  return handle(await fetch(`${BASE}/components`));
}

export async function saveLearningPath(path: LearningPath): Promise<LearningPath> {
  return handle(
    await fetch(`${BASE}/learning-paths`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(path),
    }),
  );
}

export async function loadLearningPath(id: string): Promise<LearningPath> {
  return handle(await fetch(`${BASE}/learning-paths/${encodeURIComponent(id)}`));
}
