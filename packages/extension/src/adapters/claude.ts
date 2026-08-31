import type { ConversationTurn, SiteAdapter } from "./types.js";

/**
 * Selectors verified live against claude.ai in a sibling project
 * (context-health-check) by inspecting a real conversation's DOM, not
 * guessed - reused here as-is since the extraction problem (find turns,
 * tell user from assistant) is identical regardless of which engine
 * consumes the result:
 *  - `[data-testid='transcript-list']` is the scrollable container holding
 *    every turn.
 *  - `[data-testid='transcript-row']` wraps exactly one turn each.
 *  - A row is a user turn iff it contains `[data-testid='user-message']`.
 *  - Assistant turns render into `.font-claude-response`.
 * Still falls back to the structural heuristic below if any of this stops
 * matching after a redesign - React SPA class names are not a stable
 * contract, and this claim isn't re-verified as of this build.
 */
const CONTAINER_SELECTOR = "[data-testid='transcript-list']";
const ROW_SELECTOR = "[data-testid='transcript-row']";
const USER_MESSAGE_SELECTOR = "[data-testid='user-message']";
const ASSISTANT_RESPONSE_SELECTOR = ".font-claude-response";

function extractViaAttribute(container: Element): ConversationTurn[] {
  const rows = Array.from(container.querySelectorAll<HTMLElement>(ROW_SELECTOR));
  const turns: ConversationTurn[] = [];
  for (const row of rows) {
    const userMsg = row.querySelector<HTMLElement>(USER_MESSAGE_SELECTOR);
    if (userMsg) {
      const text = (userMsg.textContent ?? "").trim();
      if (text) turns.push({ speaker: "user", text });
      continue;
    }
    const response = row.querySelector<HTMLElement>(ASSISTANT_RESPONSE_SELECTOR);
    if (response) {
      const text = (response.textContent ?? "").trim();
      if (text) turns.push({ speaker: "assistant", text });
    }
  }
  return turns;
}

function extractViaStructure(container: Element): ConversationTurn[] {
  const root = container.closest("main") ?? container;
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(":scope > div > div")).filter(
    (el) => (el.textContent ?? "").trim().length > 20,
  );
  return blocks.map((el, i) => ({
    speaker: i % 2 === 0 ? "user" : "assistant",
    text: (el.textContent ?? "").trim(),
  }));
}

export const claudeAdapter: SiteAdapter = {
  matches(url) {
    return /^https:\/\/claude\.ai\//.test(url);
  },

  getConversationContainer() {
    return document.querySelector(CONTAINER_SELECTOR) ?? document.querySelector("main");
  },

  extractTurns(container) {
    const viaAttribute = extractViaAttribute(container);
    if (viaAttribute.length > 0) return viaAttribute;
    return extractViaStructure(container);
  },

  observe(container, onChange) {
    let debounceHandle: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      if (debounceHandle) clearTimeout(debounceHandle);
      debounceHandle = setTimeout(() => {
        onChange(claudeAdapter.extractTurns(container));
      }, 400);
    });
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    return () => {
      if (debounceHandle) clearTimeout(debounceHandle);
      observer.disconnect();
    };
  },
};
