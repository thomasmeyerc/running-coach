import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY environment variable");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const CLAUDE_MODEL = "claude-opus-4-6";
export const CHAT_MAX_TOKENS = 2048;
export const PLAN_MAX_TOKENS = 8192;
