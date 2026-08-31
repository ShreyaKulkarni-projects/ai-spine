import type { ConversationTurn } from "@ai-spine/core";

/**
 * Regex-based speaker-label parser for the paste-box case. Lives only here -
 * core never parses a raw pasted string, it only ever receives already-
 * normalized ConversationTurn[].
 */
const USER_RE = /^\s*(human|user|you|me)\s*:\s?/i;
const ASSIST_RE = /^\s*(assistant|claude|chatgpt|gpt|ai|bot|model)\s*:\s?/i;

export function parseTranscript(raw: string): ConversationTurn[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const turns: ConversationTurn[] = [];
  let current: ConversationTurn | null = null;

  const pushCurrent = () => {
    if (current && current.text.trim().length > 0) turns.push(current);
  };

  for (const line of lines) {
    const stripped = line.replace(/^\*+/, "").replace(/\*+$/, "");
    if (USER_RE.test(stripped)) {
      pushCurrent();
      current = { speaker: "user", text: stripped.replace(USER_RE, "") };
    } else if (ASSIST_RE.test(stripped)) {
      pushCurrent();
      current = { speaker: "assistant", text: stripped.replace(ASSIST_RE, "") };
    } else if (current) {
      current.text += (current.text ? "\n" : "") + line;
    }
  }
  pushCurrent();

  return turns;
}
