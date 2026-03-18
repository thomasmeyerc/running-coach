import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildContextBlock, buildCoachSystemPrompt } from "@/lib/claude/prompts";
import { streamCoachResponse } from "@/lib/claude/streaming";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { message } = body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length > 5000) {
    return NextResponse.json(
      { error: "Message too long (max 5000 characters)" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Load context, preferences, and conversation history in parallel
  const [contextBlock, preferencesResult, historyResult] = await Promise.all([
    buildContextBlock(user.id),
    admin
      .from("learned_preferences")
      .select("preference_key, preference_value")
      .eq("user_id", user.id),
    admin
      .from("coach_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const preferences = (preferencesResult.data || []).map((p) => ({
    key: p.preference_key,
    value: p.preference_value,
  }));

  const systemPrompt = buildCoachSystemPrompt(preferences);

  // Build messages array: context as first user message, then history, then new message
  const conversationHistory = (historyResult.data || [])
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  // Add context block as first user message if available
  if (contextBlock.trim().length > 0) {
    messages.push({
      role: "user",
      content: `[CONTEXT — current athlete data, do not reference this block directly in your response]\n\n${contextBlock}`,
    });
    messages.push({
      role: "assistant",
      content:
        "Understood. I have your current training context. How can I help you today?",
    });
  }

  // Add conversation history
  messages.push(...conversationHistory);

  // Add new user message
  messages.push({ role: "user", content: trimmedMessage });

  // Stream the response
  const sourceStream = await streamCoachResponse(systemPrompt, messages);

  // Use TransformStream to tee the stream: one side goes to client,
  // the other collects text for DB save
  let fullResponseText = "";
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Collect text for DB save
      const decoder = new TextDecoder();
      fullResponseText += decoder.decode(chunk, { stream: true });
      // Pass chunk through to client
      controller.enqueue(chunk);
    },
    async flush() {
      // Stream is complete — save both messages to DB
      try {
        const now = new Date().toISOString();
        await admin.from("coach_messages").insert([
          {
            user_id: user.id,
            role: "user" as const,
            content: trimmedMessage,
            created_at: now,
          },
          {
            user_id: user.id,
            role: "assistant" as const,
            content: fullResponseText,
            created_at: new Date(Date.now() + 1).toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Failed to save coach messages:", err);
      }
    },
  });

  // Pipe the source stream through the transform
  sourceStream.pipeTo(writable).catch((err) => {
    console.error("Stream pipe error:", err);
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
