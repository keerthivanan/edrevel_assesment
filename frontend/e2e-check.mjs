// Real-browser end-to-end verification of the builder UI.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const APP = "http://localhost:5173";
const API = "http://localhost:8000";
const ok = (c, m) => console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
let failures = 0;
const check = (cond, msg) => { ok(cond, msg); if (!cond) failures++; };

const example = JSON.parse(readFileSync("./learning-path.example.json", "utf-8"));
example.id = "lp-e2e-001";

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

// Seed a known path so the Load flow has something to fetch.
await page.request.post(`${API}/api/learning-paths`, { data: example });

await page.goto(APP, { waitUntil: "networkidle" });

// 1. Header + palette load from API
check(await page.getByText("Adaptive Learning Path Builder").isVisible(), "header renders");
await page.waitForSelector('[data-testid="palette-card"]');
const cards = await page.locator('[data-testid="palette-card"]').count();
check(cards === 8, `left panel loaded ${cards} components from API (expect 8)`);

// 2. Load a saved path through the real UI
await page.getByPlaceholder("path id to load…").fill("lp-e2e-001");
await page.getByRole("button", { name: "Load" }).click();
await page.waitForSelector('[data-testid="content-node"]');
const nodes = await page.locator('[data-testid="content-node"]').count();
const edges = await page.locator(".react-flow__edge").count();
check(nodes === 4, `canvas rendered ${nodes} nodes after load (expect 4)`);
check(edges === 3, `canvas rendered ${edges} edges after load (expect 3)`);

// 3. Edge label must be a compact pill, NOT a full-width bar (the bug we fixed)
const label = page.locator(".edge-label").first();
await label.waitFor();
const box = await label.boundingBox();
const canvasW = (await page.locator(".canvas").boundingBox()).width;
check(box.width < canvasW * 0.5, `edge label is a pill (w=${Math.round(box.width)}px, canvas=${Math.round(canvasW)}px)`);

// 4. Select a node -> properties panel shows an editable label
await page.locator('[data-testid="content-node"]').nth(1).click();
const labelInput = page.locator('.props input').first();
await labelInput.waitFor();
const before = await labelInput.inputValue();
await labelInput.fill(before + " (edited)");
check((await labelInput.inputValue()).includes("(edited)"), "node label is editable in properties panel");

// 5. Select an edge -> condition editor works
await page.locator(".react-flow__edge").nth(1).click();
check(await page.getByText("Assignment Conditions").isVisible(), "edge shows Assignment Conditions editor");
const rulesBefore = await page.locator('[data-testid="rule"]').count();
await page.getByRole("button", { name: "+ Add condition" }).click();
const rulesAfter = await page.locator('[data-testid="rule"]').count();
check(rulesAfter === rulesBefore + 1, `add-condition added a rule row (${rulesBefore} -> ${rulesAfter})`);

// 6. Drag-and-drop a palette item onto the canvas (HTML5 DnD via real DataTransfer)
const nodesPre = await page.locator('[data-testid="content-node"]').count();
await page.evaluate(() => {
  const card = document.querySelector('[data-testid="palette-card"]');
  const canvas = document.querySelector(".canvas");
  const dt = new DataTransfer();
  const fire = (el, type, extra = {}) =>
    el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, ...extra }));
  fire(card, "dragstart");
  const r = canvas.getBoundingClientRect();
  fire(canvas, "dragover", { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
  fire(canvas, "drop", { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
});
await page.waitForTimeout(300);
const nodesPost = await page.locator('[data-testid="content-node"]').count();
check(nodesPost === nodesPre + 1, `drag-drop added a node to canvas (${nodesPre} -> ${nodesPost})`);

// 7. Save through the UI -> status bar confirms (wait for the message to change)
await page.getByRole("button", { name: "Save Draft" }).click();
let status = "";
try {
  await page.locator(".statusbar", { hasText: "Saved" }).waitFor({ timeout: 8000 });
  status = await page.locator(".statusbar").innerText();
} catch {
  status = await page.locator(".statusbar").innerText();
}
check(/Saved/.test(status), `Save Draft persisted via API: "${status.trim()}"`);

// 8. No uncaught console errors
check(consoleErrors.length === 0, `no console/page errors (${consoleErrors.length})`);
if (consoleErrors.length) consoleErrors.slice(0, 5).forEach((e) => console.log("   err:", e));

await page.screenshot({ path: "e2e-screenshot.png", fullPage: true });
console.log("\nScreenshot saved -> frontend/e2e-screenshot.png");
console.log(failures === 0 ? "\n=== ALL E2E CHECKS PASSED ===" : `\n=== ${failures} E2E CHECK(S) FAILED ===`);

await browser.close();
process.exit(failures === 0 ? 0 : 1);
