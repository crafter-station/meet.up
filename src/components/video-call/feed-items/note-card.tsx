"use client";

import type { NoteFeedItem } from "@/components/video-call/types";
import { Check, PenLine, X } from "lucide-react";
import { useRef, useState } from "react";

interface NoteCardProps {
  item: NoteFeedItem;
  isMe: boolean;
  onUpdate: (id: string, updates: { content: string }) => void;
}

export function NoteCard({ item, isMe, onUpdate }: NoteCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.content) {
      onUpdate(item.id, { content: trimmed });
    }
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1">
        <PenLine className="h-3 w-3 text-muted-foreground/50" />
        <span className="text-[10px] text-muted-foreground/60">
          {item.username} — note
        </span>
        {isMe && !editing && (
          <button
            className="ml-auto text-muted-foreground/40 hover:text-muted-foreground"
            onClick={() => {
              setDraft(item.content);
              setEditing(true);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
          >
            <PenLine className="h-3 w-3" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-1.5">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full bg-transparent text-[13px] text-foreground outline-none resize-none min-h-[3rem]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <div className="flex gap-1 justify-end">
            <button
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/30"
              onClick={() => setEditing(false)}
            >
              <X className="h-3 w-3" />
            </button>
            <button
              className="p-1 rounded text-green-500 hover:text-green-400 hover:bg-muted/30"
              onClick={save}
            >
              <Check className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
          {item.content}
        </p>
      )}
    </div>
  );
}
