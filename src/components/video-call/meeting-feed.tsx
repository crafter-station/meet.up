"use client";

import type { ChatMessage, FeedItem } from "@/components/video-call/types";
import { LayoutList, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { FeedComposer } from "./feed-composer";
import { FeedTimeline } from "./feed-timeline";

interface MeetingFeedProps {
  messages: ChatMessage[];
  feedItems: FeedItem[];
  onSendChat: (content: string) => void;
  onAddFeedItem: (item: {
    type: string;
    title?: string;
    content: string;
    metadata?: string;
  }) => void;
  onUpdateFeedItem: (
    id: string,
    updates: { content?: string; title?: string; isDone?: boolean },
  ) => void;
  username: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function MeetingFeed({
  messages,
  feedItems,
  onSendChat,
  onAddFeedItem,
  onUpdateFeedItem,
  username,
  expanded,
  onToggleExpand,
}: MeetingFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new items
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, feedItems.length]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
        <LayoutList className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Meeting Feed</h2>
        {onToggleExpand && (
          <button
            className="ml-auto hidden md:flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            onClick={onToggleExpand}
            title={expanded ? "Collapse panel" : "Expand panel"}
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Timeline */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2
        [scrollbar-width:thin]
        [scrollbar-color:rgba(255,255,255,0.1)_transparent]
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-white/10"
      >
        <FeedTimeline
          messages={messages}
          feedItems={feedItems}
          username={username}
          onUpdateFeedItem={onUpdateFeedItem}
        />
      </div>

      {/* Composer */}
      <FeedComposer
        onSendChat={onSendChat}
        onAddNote={(content) =>
          onAddFeedItem({ type: "note", content })
        }
        onAddActionItem={(content) =>
          onAddFeedItem({ type: "action_item", content })
        }
      />
    </div>
  );
}
