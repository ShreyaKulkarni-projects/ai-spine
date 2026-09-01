import { claudeAdapter } from "./adapters/claude.js";
import { chatgptAdapter } from "./adapters/chatgpt.js";
import type { ConversationTurn, SiteAdapter } from "./adapters/types.js";

export type ContentMessage = { type: "turns"; turns: ConversationTurn[] } | { type: "detection-failed" };

const adapters: SiteAdapter[] = [claudeAdapter, chatgptAdapter];

function findAdapter(): SiteAdapter | undefined {
  return adapters.find((a) => a.matches(window.location.href));
}

function send(message: ContentMessage) {
  chrome.runtime.sendMessage(message).catch(() => {
    // No listener yet (side panel not open) - safe to ignore.
  });
}

/**
 * Attempts detection once. Returns true if a container was found (whether
 * or not it had any turns yet) and hands off to the adapter's own observer
 * for ongoing updates. Returns false if there's no container at all yet -
 * the caller is responsible for retrying.
 *
 * Verified live against claude.ai (see commit history): switching between
 * two *existing* conversations in the same tab reuses the same container
 * element and mutates its contents in place - it does not get replaced.
 * A single long-lived observer on that element, attached once here, keeps
 * catching every subsequent switch without needing to re-detect.
 */
function tryDetect(adapter: SiteAdapter): boolean {
  const container = adapter.getConversationContainer();
  if (!container) return false;

  const initialTurns = adapter.extractTurns(container);
  send(initialTurns.length === 0 ? { type: "detection-failed" } : { type: "turns", turns: initialTurns });

  adapter.observe(container, (turns) => {
    send(turns.length === 0 ? { type: "detection-failed" } : { type: "turns", turns });
  });
  return true;
}

function start() {
  const adapter = findAdapter();
  if (!adapter) return;

  if (tryDetect(adapter)) return;

  // No container yet - claude.ai and chatgpt.com route between
  // conversations client-side (no full page reload), so a content script
  // that only checks once at document_idle can miss every conversation
  // that wasn't already open at that exact moment (e.g. the panel loads on
  // the chat list or a "new chat" screen, then the user clicks into a real
  // conversation with no new navigation event for this script to react
  // to). Keep watching the whole document until a container actually
  // appears, then hand off to the adapter's normal per-container observer.
  send({ type: "detection-failed" });
  const bodyObserver = new MutationObserver(() => {
    if (tryDetect(adapter)) bodyObserver.disconnect();
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "request-turns") {
    const adapter = findAdapter();
    const container = adapter?.getConversationContainer();
    if (adapter && container) {
      const turns = adapter.extractTurns(container);
      sendResponse(turns.length > 0 ? { type: "turns", turns } : { type: "detection-failed" });
    } else {
      sendResponse({ type: "detection-failed" });
    }
  }
  return true;
});

start();
