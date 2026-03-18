"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface FeedbackButtonsProps {
  interactionType: "chat" | "plan" | "analysis";
  interactionId?: string;
  responseSnapshot?: string;
}

export function FeedbackButtons({
  interactionType,
  interactionId,
  responseSnapshot,
}: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState<"thumbs_up" | "thumbs_down" | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitFeedback(rating: "thumbs_up" | "thumbs_down") {
    setLoading(true);
    setSubmitted(rating);

    if (rating === "thumbs_down") {
      setShowComment(true);
      setLoading(false);
      return;
    }

    await sendFeedback(rating, "");
    setLoading(false);
  }

  async function sendFeedback(rating: "thumbs_up" | "thumbs_down", feedbackComment: string) {
    await fetch("/api/coach/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interaction_type: interactionType,
        interaction_id: interactionId,
        rating,
        comment: feedbackComment || undefined,
        response_snapshot: responseSnapshot,
      }),
    });
  }

  async function handleCommentSubmit() {
    setLoading(true);
    await sendFeedback("thumbs_down", comment);
    setShowComment(false);
    setLoading(false);
  }

  if (submitted && !showComment) {
    return (
      <span className="text-xs text-muted-foreground">
        {submitted === "thumbs_up" ? "Thanks for the feedback!" : "Feedback recorded"}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => submitFeedback("thumbs_up")}
          disabled={loading || submitted === "thumbs_up"}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => submitFeedback("thumbs_down")}
          disabled={loading || submitted === "thumbs_down"}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      {showComment && (
        <div className="space-y-2">
          <Textarea
            placeholder="What could be improved?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="text-xs"
            rows={2}
          />
          <Button size="sm" onClick={handleCommentSubmit} disabled={loading}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
