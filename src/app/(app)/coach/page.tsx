export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/coach/chat-interface";

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load last 50 messages for initial display
  const { data: messages } = await supabase
    .from("coach_messages")
    .select("role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const initialMessages = (messages || [])
    .reverse()
    .map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    }));

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col md:h-[calc(100vh-3rem)]">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">AI Coach</h1>
        <p className="text-muted-foreground">
          Chat with your personal running coach. Ask about training, nutrition,
          recovery, and more.
        </p>
      </div>
      <ChatInterface initialMessages={initialMessages} />
    </div>
  );
}
