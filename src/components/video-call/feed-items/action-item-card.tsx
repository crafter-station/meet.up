"use client";

import type { ActionItemFeedItem } from "@/components/video-call/types";
import { Circle, CircleCheck } from "lucide-react";

interface ActionItemCardProps {
  item: ActionItemFeedItem;
  onToggle: (id: string, isDone: boolean) => void;
}

export function ActionItemCard({ item, onToggle }: ActionItemCardProps) {
  return (
    <button
      className="flex items-start gap-2 w-full rounded-lg border border-border/40 bg-muted/10 px-3 py-2 text-left hover:bg-muted/20 transition-colors"
      onClick={() => onToggle(item.id, !item.isDone)}
    >
      {item.isDone ? (
        <CircleCheck className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
      )}
      <span
        className={`text-[13px] leading-snug ${
          item.isDone
            ? "line-through text-muted-foreground/50"
            : "text-foreground/80"
        }`}
      >
        {item.content}
      </span>
    </button>
  );
}
