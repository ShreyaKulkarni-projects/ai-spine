#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { analyze, AnthropicJudge } from "@ai-spine/core";

const turnSchema = z.object({
  speaker: z.enum(["user", "assistant"]),
  text: z.string(),
  timestamp: z.number().optional(),
});

const inputShape = {
  turns: z.array(turnSchema).describe("Ordered conversation turns to check."),
  apiKey: z
    .string()
    .optional()
    .describe(
      "Optional Anthropic API key. Without it, only Tier 1 (surface flattery, offline) runs. With it, Tier 2 (position-reversal judging) also runs - one call per candidate exchange, sent directly to Anthropic, never stored or logged by this server.",
    ),
};

const server = new McpServer({
  name: "ai-spine-mcp",
  version: "0.1.0",
});

server.tool(
  "check_spine",
  "Checks whether an AI conversation shows signs of sycophancy: surface flattery (always checked) and, if an API key is provided, position reversals under user pushback with no new evidence (the failure mode that actually matters). Returns a 0-100 score, a grade, and specific findings.",
  inputShape,
  async ({ turns, apiKey }) => {
    const judge = apiKey ? new AnthropicJudge({ apiKey }) : undefined;
    const result = await analyze(turns, judge ? { judge } : {});

    const summary = result.tier2.ran
      ? `Tier 2 ran: checked ${result.tier2.candidatesChecked} candidate exchange(s).`
      : "Tier 2 did NOT run (no apiKey provided) - this score reflects surface flattery only, not position-reversal checking.";

    return {
      content: [
        { type: "text", text: summary },
        { type: "text", text: JSON.stringify(result, null, 2) },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("ai-spine-mcp fatal error:", err);
  process.exit(1);
});
