import { getAnthropicClient, CLAUDE_MODEL, CHAT_MAX_TOKENS } from "./client";

export async function streamCoachResponse(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<ReadableStream<Uint8Array>> {
  const anthropic = getAnthropicClient();

  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: CHAT_MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function generateStructuredResponse(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096
): Promise<string> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text || "";
}
