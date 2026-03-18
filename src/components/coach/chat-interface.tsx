"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  role: string;
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  initialMessages: Message[];
}

function formatMessageContent(content: string) {
  // Simple markdown-like formatting for bold, lists, and line breaks
  const lines = content.split("\n");

  return lines.map((line, i) => {
    // Bold text: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formattedParts = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    // Bullet lists
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <li key={i} className="ml-4 list-disc">
          {formattedParts.map((p, idx) =>
            typeof p === "string" ? p.replace(/^[-*]\s/, "") : p
          )}
        </li>
      );
    }

    // Numbered lists
    if (/^\d+\.\s/.test(trimmed)) {
      return (
        <li key={i} className="ml-4 list-decimal">
          {formattedParts.map((p, idx) =>
            typeof p === "string" ? p.replace(/^\d+\.\s/, "") : p
          )}
        </li>
      );
    }

    // Empty lines become spacing
    if (trimmed === "") {
      return <br key={i} />;
    }

    return (
      <p key={i} className="leading-relaxed">
        {formattedParts}
      </p>
    );
  });
}

export function ChatInterface({ initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    // Optimistically add user message
    const userMessage: Message = {
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder assistant message
    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      abortRef.current = new AbortController();

      const response = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // Update the last message (assistant) with accumulated text
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: accumulated,
          };
          return updated;
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";

      // Update assistant message with error
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {/* Messages area */}
        <div className="min-h-0 flex-1" ref={scrollRef}>
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {isEmpty && !isStreaming && (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
                  <Bot className="h-12 w-12 text-muted-foreground/40" />
                  <div>
                    <p className="font-medium text-muted-foreground">
                      No messages yet
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground/70">
                      Ask your coach about training plans, pacing strategies,
                      recovery tips, or anything running-related.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {msg.role === "assistant" && msg.content === "" ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs">Thinking...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {formatMessageContent(msg.content)}
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your coach anything..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Your coach has access to your training data for personalized advice.
            Press Shift+Enter for a new line.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
