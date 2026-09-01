import { analyze, AnthropicJudge, CachingJudge, type AnalysisResult, type SpineFinding, type SpineJudge } from "@ai-spine/core";
import { parseTranscript } from "@ai-spine/web-demo/parseTranscript";
import type { ContentMessage } from "../content-script.js";
import type { ConversationTurn } from "../adapters/types.js";
import { loadSettings, saveSettings, type PanelSettings } from "./settings.js";

const GRADE_COLOR: Record<string, string> = {
  solid: "var(--good)",
  "mostly-holds": "var(--accent)",
  folds: "var(--warn)",
  "no-spine": "var(--bad)",
};

// ---------- Settings ----------
const settingsToggle = document.getElementById("settingsToggle") as HTMLButtonElement;
const settingsPanel = document.getElementById("settingsPanel") as HTMLElement;
const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;

settingsToggle.addEventListener("click", () => settingsPanel.classList.toggle("show"));

let settings: PanelSettings;
// A single, persistent CachingJudge wraps the real judge across the whole
// panel session - see core's CachingJudge doc comment for why this matters
// here specifically: every DOM mutation re-runs analyze() from scratch
// (there's no incremental analyzer API in this project), so without a
// cache, an early candidate gets re-classified by a real API call on every
// single re-render as the conversation grows.
let judge: SpineJudge | undefined;

function rebuildJudge() {
  judge = settings.apiKey ? new CachingJudge(new AnthropicJudge({ apiKey: settings.apiKey })) : undefined;
}

async function initSettings() {
  settings = await loadSettings();
  apiKeyInput.value = settings.apiKey;
  rebuildJudge();
}

apiKeyInput.addEventListener("change", async () => {
  settings = await saveSettings({ apiKey: apiKeyInput.value.trim() });
  rebuildJudge();
  if (lastTurns.length > 0) void runAnalysis(lastTurns);
});

// ---------- Analysis state ----------
// No incremental analyzer here (unlike a sibling project's
// ConversationAnalyzer) - analyze() re-derives everything from the full
// turns array each call. A monotonic request id guards against a slower,
// earlier call (e.g. one that hit the network for Tier 2) resolving after
// a faster, newer one and overwriting the UI with stale data.
let lastTurns: ConversationTurn[] = [];
let requestId = 0;

async function runAnalysis(turns: ConversationTurn[]) {
  lastTurns = turns;
  const thisRequest = ++requestId;
  const result = await analyze(turns, judge ? { judge } : {});
  if (thisRequest !== requestId) return; // a newer request has since started
  render(result);
}

// ---------- Rendering ----------
function labeledSection(label: string, contentEl: HTMLElement): HTMLElement {
  const section = document.createElement("div");
  section.className = "f-section";
  const labelEl = document.createElement("div");
  labelEl.className = "f-label";
  labelEl.textContent = label;
  section.appendChild(labelEl);
  section.appendChild(contentEl);
  return section;
}

function renderFinding(f: SpineFinding): HTMLElement {
  const item = document.createElement("div");
  item.className = "finding";

  const kind = document.createElement("div");
  kind.className = "f-kind";
  kind.textContent = f.kind === "sycophantic-reversal" ? "Sycophantic reversal" : "Surface flattery";

  const title = document.createElement("div");
  title.className = "f-title";
  title.textContent = f.title;

  const desc = document.createElement("div");
  desc.className = "f-desc";
  desc.textContent = f.description;

  const why = document.createElement("p");
  why.className = "f-why";
  why.textContent = f.why;

  const steps = document.createElement("ol");
  steps.className = "f-steps";
  f.how.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    steps.appendChild(li);
  });

  const impact = document.createElement("p");
  impact.className = "f-impact";
  impact.textContent = f.impact;

  item.appendChild(kind);
  item.appendChild(title);
  item.appendChild(desc);
  item.appendChild(labeledSection("Why", why));
  item.appendChild(labeledSection("How to check it", steps));
  item.appendChild(labeledSection("After", impact));
  return item;
}

function render(result: AnalysisResult) {
  const scoreNum = document.getElementById("scoreNum")!;
  scoreNum.textContent = String(result.score.score);
  (scoreNum as HTMLElement).style.color = GRADE_COLOR[result.score.grade.key] ?? "var(--ink)";

  const pill = document.getElementById("gradePill")!;
  pill.textContent = result.score.grade.label;
  (pill as HTMLElement).style.background = GRADE_COLOR[result.score.grade.key] ?? "var(--ink)";

  const tierNote = document.getElementById("tierNote")!;
  tierNote.textContent =
    result.turns.length === 0
      ? "Open a conversation on claude.ai or chatgpt.com to see its spine score."
      : result.tier2.ran
        ? `Tier 2 ran: ${result.tier2.candidatesChecked} candidate(s) checked, ${result.tier2.sycophanticReversals.length} sycophantic reversal(s) found.`
        : "Tier 2 off (no API key) - surface flattery only.";

  const list = document.getElementById("findingsList")!;
  list.innerHTML = "";
  if (result.findings.length === 0) {
    const none = document.createElement("p");
    none.className = "none-note";
    none.textContent = result.turns.length === 0 ? "" : "No findings.";
    list.appendChild(none);
  } else {
    result.findings.forEach((f) => list.appendChild(renderFinding(f)));
  }
}

// ---------- Live detection vs paste-box fallback ----------
const liveView = document.getElementById("liveView") as HTMLElement;
const pasteBox = document.getElementById("pasteBox") as HTMLElement;
const statusLine = document.getElementById("statusLine") as HTMLElement;
const statusText = document.getElementById("statusText") as HTMLElement;

function showFallback(message = "Automatic detection unavailable - paste your conversation below.") {
  liveView.style.display = "none";
  pasteBox.style.display = "block";
  statusLine.classList.add("fallback");
  statusText.textContent = message;
}

function showLive() {
  liveView.style.display = "block";
  pasteBox.style.display = "none";
  statusLine.classList.remove("fallback");
  statusText.textContent = "Watching this conversation...";
}

document.getElementById("analyzePasteBtn")!.addEventListener("click", () => {
  const raw = (document.getElementById("transcript") as HTMLTextAreaElement).value;
  if (!raw.trim()) return;
  const turns = parseTranscript(raw).map((t) => ({ speaker: t.speaker, text: t.text }));
  void runAnalysis(turns);
});

chrome.runtime.onMessage.addListener((message: ContentMessage) => {
  if (message?.type === "turns") {
    showLive();
    void runAnalysis(message.turns);
  } else if (message?.type === "detection-failed") {
    showFallback();
  }
});

async function requestInitialTurns() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "request-turns" }, (response: ContentMessage | undefined) => {
      if (chrome.runtime.lastError || !response) {
        // Most common cause: the tab was already open before the extension
        // was loaded/reloaded, so Chrome never injected the content script
        // into it - reloading an extension does not retroactively inject
        // into already-open tabs. Surface this instead of silently doing
        // nothing, which is what happened here before this fix.
        showFallback("Can't reach this tab - try refreshing the page (the extension may have loaded after the tab did), then reopen this panel.");
        return;
      }
      if (response.type === "turns") {
        showLive();
        void runAnalysis(response.turns);
      } else if (response.type === "detection-failed") {
        showFallback();
      }
    });
  } catch {
    // Panel opened without an active supported tab - leave the empty live view showing.
  }
}

initSettings().then(() => {
  requestInitialTurns();
});

chrome.tabs.onActivated.addListener(() => requestInitialTurns());
chrome.tabs.onUpdated.addListener((_id, changeInfo) => {
  if (changeInfo.status === "complete") requestInitialTurns();
});
