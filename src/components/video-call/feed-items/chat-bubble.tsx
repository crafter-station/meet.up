"use client";

import type { ChatMessage } from "@/components/video-call/types";

interface ChatBubbleProps {
  message: ChatMessage;
  isMe: boolean;
}

export function ChatBubble({ message, isMe }: ChatBubbleProps) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-1.5 text-[13px] ${
          isMe
            ? "bg-primary/10 text-foreground"
            : "bg-muted/40 text-foreground"
        }`}
      >
        {!isMe && (
          <p className="text-[10px] text-muted-foreground/60 mb-0.5">
            {message.username}
          </p>
        )}
        <p className="leading-snug">{message.content}</p>
      </div>
    </div>
  );
}
