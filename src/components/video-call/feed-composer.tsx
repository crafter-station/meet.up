"use client";

import {
  CheckSquare,
  PenLine,
  Send,
} from "lucide-react";
import { useState } from "react";

type ComposerMode = "chat" | "note" | "action_item";

interface FeedComposerProps {
  onSendChat: (content: string) => void;
  onAddNote: (content: string) => void;
  onAddActionItem: (content: string) => void;
}

export function FeedComposer({
  onSendChat,
  onAddNote,
  onAddActionItem,
}: FeedComposerProps) {
  const [mode, setMode] = useState<ComposerMode>("chat");
  const [input, setInput] = useState("");

  const placeholder =
    mode === "chat"
      ? "Send a message..."
      : mode === "note"
        ? "Write a note..."
        : "Add an action item...";

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (mode === "chat") onSendChat(trimmed);
    else if (mode === "note") onAddNote(trimmed);
    else onAddActionItem(trimmed);
    setInput("");
    if (mode !== "chat") setMode("chat");
  };

  return (
    <div className="border-t border-border/30 px-3 py-2 shrink-0">
      <div className="flex items-center gap-1 mb-1.5">
        <button
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-colors ${
            mode === "note"
              ? "bg-primary/15 text-foreground"
              : "text-muted-foreground/60 hover:text-muted-foreground"
          }`}
          onClick={() => setMode(mode === "note" ? "chat" : "note")}
        >
          <PenLine className="h-2.5 w-2.5" />
          Note
        </button>
        <button
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-colors ${
            mode === "action_item"
              ? "bg-primary/15 text-foreground"
              : "text-muted-foreground/60 hover:text-muted-foreground"
          }`}
          onClick={() =>
            setMode(mode === "action_item" ? "chat" : "action_item")
          }
        >
          <CheckSquare className="h-2.5 w-2.5" />
          Action
        </button>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors p-1"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
