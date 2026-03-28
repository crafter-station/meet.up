"use client";

import type {
  ChatMessage,
  FeedItem,
  TimelineEntry,
} from "@/components/video-call/types";
import { useMemo } from "react";
import { ChatBubble } from "./feed-items/chat-bubble";
import { ArtifactCard } from "./feed-items/artifact-card";
import { NoteCard } from "./feed-items/note-card";
import { ActionItemCard } from "./feed-items/action-item-card";

interface FeedTimelineProps {
  messages: ChatMessage[];
  feedItems: FeedItem[];
  username: string;
  onUpdateFeedItem: (
    id: string,
    updates: { content?: string; title?: string; isDone?: boolean },
  ) => void;
}

export function FeedTimeline({
  messages,
  feedItems,
  username,
  onUpdateFeedItem,
}: FeedTimelineProps) {
  const timeline = useMemo<TimelineEntry[]>(() => {
    const chatEntries: TimelineEntry[] = messages
      .filter((m) => m.type === "chat")
      .map((m) => ({ kind: "chat", data: m }));

    const feedEntries: TimelineEntry[] = feedItems.map((f) => ({
      kind: "feed",
      data: f,
    }));

    return [...chatEntries, ...feedEntries].sort((a, b) => {
      const tA =
        a.kind === "chat" ? a.data.timestamp : a.data.createdAt;
      const tB =
        b.kind === "chat" ? b.data.timestamp : b.data.createdAt;
      return tA - tB;
    });
  }, [messages, feedItems]);

  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <p className="text-muted-foreground/40 text-xs">
          Chat messages, notes, and artifacts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {timeline.map((entry) => {
        if (entry.kind === "chat") {
          return (
            <ChatBubble
              key={entry.data.id}
              message={entry.data}
              isMe={entry.data.username === username}
            />
          );
        }

        const item = entry.data;
        switch (item.type) {
          case "artifact":
            return <ArtifactCard key={item.id} item={item} />;
          case "note":
            return (
              <NoteCard
                key={item.id}
                item={item}
                isMe={item.username === username}
                onUpdate={onUpdateFeedItem}
              />
            );
          case "action_item":
            return (
              <ActionItemCard
                key={item.id}
                item={item}
                onToggle={(id, isDone) =>
                  onUpdateFeedItem(id, { isDone })
                }
              />
            );
        }
      })}
    </div>
  );
}
