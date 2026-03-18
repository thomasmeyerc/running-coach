"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send, Bot, User, Loader2, MessageSquare, X, RefreshCw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Make this week easier, I'm feeling tired",
  "Can you swap my long run to Sunday?",
  "Add a tempo session on Wednesday",
  "My knee is sore — adjust the plan",
  "Increase my weekly distance by 10%",
];

function formatContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formatted = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return <li key={i} className="ml-4 list-disc">{formatted.map((p) => typeof p === "string" ? p.replace(/^[-*]\s/, "") : p)}</li>;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      return <li key={i} className="ml-4 list-decimal">{formatted.map((p) => typeof p === "string" ? p.replace(/^\d+\.\s/, "") : p)}</li>;
    }
    if (trimmed === "") return <br key={i} />;
    return <p key={i} className="leading-relaxed">{formatted}</p>;
  });
}

export function PlanCoach() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open]);

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput("");
    setLoading(true);

    const userMsg: Message = { role: "user", content: msg };
    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch("/api/coach/plan-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to send message");
      }

      const data = await res.json();

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: data.message };
        return updated;
      });

      // If the plan was modified, refresh the page to show updated sessions
      if (data.plan_modified) {
        router.refresh();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        Chat with Coach
      </Button>
    );
  }

  return (
    <Card className="flex flex-col" style={{ height: "480px" }}>
      <CardHeader className="flex-none pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Plan Coach</CardTitle>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {/* Messages */}
        <div className="min-h-0 flex-1" ref={scrollRef}>
          <ScrollArea className="h-full">
            <div className="space-y-3 px-4 py-2">
              {messages.length === 0 && (
                <div className="space-y-3 py-4">
                  <p className="text-center text-xs text-muted-foreground">
                    Ask your coach to adjust the plan. Changes are applied automatically.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-xs",
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    {msg.role === "assistant" && msg.content === "" ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">{formatContent(msg.content)}</div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="flex-none border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask to adjust your plan..."
              className="min-h-[36px] max-h-20 resize-none text-xs"
              rows={1}
              disabled={loading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              size="icon-sm"
              className="h-9 w-9 shrink-0"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RegeneratePlanButton({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    if (!confirm("This will replace your current training plan with a new one. Continue?")) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coach/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: goalId }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error || "Failed to regenerate plan";
        if (msg.includes("credit balance") || msg.includes("billing")) {
          throw new Error("AI service credits need to be topped up.");
        }
        throw new Error(msg);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleRegenerate} disabled={loading} variant="outline" size="sm" className="gap-2">
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Regenerating...
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate Plan
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
