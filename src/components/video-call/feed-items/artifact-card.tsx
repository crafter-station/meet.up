"use client";

import type { ArtifactFeedItem } from "@/components/video-call/types";
import { LinkPreviews } from "@/components/ai-elements/link-preview";
import { MessageResponse } from "@/components/ai-elements/message";
import { Sparkles } from "lucide-react";

interface ArtifactCardProps {
  item: ArtifactFeedItem;
}

export function ArtifactCard({ item }: ArtifactCardProps) {
  const isTitleLoading = !item.title;

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
        <Sparkles className="h-3.5 w-3.5 text-[#a3b339]" />
        {isTitleLoading ? (
          <span className="h-3.5 w-32 rounded-md bg-muted-foreground/10 animate-pulse" />
        ) : (
          <span className="text-xs font-medium text-foreground truncate">
            {item.title}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/50 ml-auto shrink-0">
          {item.username}
        </span>
      </div>
      <div className="px-3 py-2 text-[13px] text-foreground/80 leading-relaxed max-h-64 overflow-y-auto">
        <MessageResponse mode="static">{item.content}</MessageResponse>
        <LinkPreviews content={item.content} />
      </div>
    </div>
  );
}
