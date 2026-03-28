"use client";

import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import {
  getCachedSummary,
  setCachedSummary,
} from "@/lib/summary-cache";
import {
  Check,
  CheckSquare,
  Circle,
  CircleCheck,
  Clock,
  Copy,
  Home,
  Loader2,
  PenLine,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className={`flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors ${className}`}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

interface SummaryClientProps {
  roomId: string;
  meetingDate: string;
  participantNames: string[];
  transcriptCount: number;
  artifacts: {
    id: string;
    title: string;
    content: string;
    username: string;
    time: string;
  }[];
  notes: {
    id: string;
    content: string;
    username: string;
    time: string;
  }[];
  actionItems: {
    id: string;
    content: string;
    isDone: boolean;
  }[];
}

export function SummaryClient({
  roomId,
  meetingDate,
  participantNames,
  transcriptCount,
  artifacts,
  notes,
  actionItems,
}: SummaryClientProps) {
  const [title, setTitle] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  const date = new Date(meetingDate);

  const buildFullMarkdown = useCallback(() => {
    let md = title ? `# ${title}\n\n` : "";
    md += summaryText + "\n";
    if (actionItems.length > 0) {
      md += "\n## Action Items\n";
      md += actionItems
        .map((a) => `- [${a.isDone ? "x" : " "}] ${a.content}`)
        .join("\n");
      md += "\n";
    }
    if (artifacts.length > 0) {
      md += "\n## Pinned Artifacts\n";
      md += artifacts
        .map((a) => `### ${a.title} (${a.time})\n${a.content}`)
        .join("\n\n");
      md += "\n";
    }
    if (notes.length > 0) {
      md += "\n## Meeting Notes\n";
      md += notes
        .map((n) => `> **${n.username}** (${n.time}): ${n.content}`)
        .join("\n\n");
      md += "\n";
    }
    return md;
  }, [title, summaryText, actionItems, artifacts, notes]);

  const startStreaming = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Check in-memory cache first (instant if prefetched on hover)
    const cached = getCachedSummary(roomId);
    if (cached) {
      setTitle(cached.title);
      setSummaryText(cached.summary);
      setDone(true);
      return;
    }

    setStreaming(true);

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });

      if (!res.ok) {
        setStreaming(false);
        setDone(true);
        return;
      }

      // Check if it's a cached JSON response
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        const t = data.title ?? "Meeting Summary";
        setTitle(t);
        setSummaryText(data.summary);
        setCachedSummary(roomId, { title: t, summary: data.summary });
        setStreaming(false);
        setDone(true);
        return;
      }

      // Read title from header (generated before streaming starts)
      const headerTitle = res.headers.get("X-Meeting-Title");
      if (headerTitle) {
        setTitle(decodeURIComponent(headerTitle));
      }

      // Stream the response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let fullText = "";
      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setSummaryText((prev) => prev + chunk);
      }

      // Cache the completed streamed result
      const finalTitle = headerTitle
        ? decodeURIComponent(headerTitle)
        : "Meeting Summary";
      setCachedSummary(roomId, { title: finalTitle, summary: fullText });

      setStreaming(false);
      setDone(true);
    } catch {
      setStreaming(false);
      setDone(true);
    }
  }, [roomId]);

  useEffect(() => {
    startStreaming();
  }, [startStreaming]);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight min-h-[2rem]">
            {title || "\u00A0"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {roomId} &middot;{" "}
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {" at "}
            {date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {/* Copy all */}
          {done && summaryText && (
            <CopyButton
              text={buildFullMarkdown()}
              label="Copy all as Markdown"
              className="text-xs"
            />
          )}

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3">
            {participantNames.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-muted/30 border border-border/30 px-3 py-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {participantNames.join(", ")}
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-muted/30 border border-border/30 px-3 py-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {transcriptCount} transcript messages
            </div>
            {artifacts.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-muted/30 border border-border/30 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {artifacts.length} artifact{artifacts.length > 1 ? "s" : ""}
              </div>
            )}
            {actionItems.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-muted/30 border border-border/30 px-3 py-1 text-xs text-muted-foreground">
                <CheckSquare className="h-3 w-3" />
                {actionItems.filter((a) => a.isDone).length}/
                {actionItems.length} done
              </div>
            )}
          </div>
        </div>

        {/* Streaming summary */}
        <div className="space-y-2">
          {streaming && !summaryText && (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Generating summary...</span>
            </div>
          )}
          {summaryText && (
            <div className="group/summary relative">
              {done && (
                <div className="absolute top-0 right-0 opacity-0 group-hover/summary:opacity-100 transition-opacity">
                  <CopyButton text={summaryText} label="Copy" />
                </div>
              )}
              <div className="text-foreground text-sm leading-relaxed">
                <MessageResponse mode={streaming ? "streaming" : "static"}>
                  {summaryText}
                </MessageResponse>
              </div>
            </div>
          )}
        </div>

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Action Items
              </h2>
              <CopyButton
                text={actionItems.map((a) => `- [${a.isDone ? "x" : " "}] ${a.content}`).join("\n")}
              />
            </div>
            <div className="space-y-1.5">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg p-2"
                >
                  {item.isDone ? (
                    <CircleCheck className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      item.isDone
                        ? "line-through text-muted-foreground/50"
                        : "text-foreground/80"
                    }`}
                  >
                    {item.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pinned Artifacts */}
        {artifacts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Pinned Artifacts
              </h2>
              <CopyButton
                text={artifacts.map((a) => `### ${a.title}\n${a.content}`).join("\n\n")}
              />
            </div>
            <div className="space-y-3">
              {artifacts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-border/50 bg-muted/10 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium">{a.title}</span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">
                      {a.time}
                    </span>
                  </div>
                  <div className="text-foreground/80 text-sm leading-relaxed">
                    <MessageResponse mode="static">{a.content}</MessageResponse>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meeting Notes */}
        {notes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Meeting Notes
              </h2>
              <CopyButton
                text={notes.map((n) => `**${n.username}**: ${n.content}`).join("\n\n")}
              />
            </div>
            <div className="space-y-2">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/10 p-3"
                >
                  <PenLine className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-muted-foreground">
                        {n.username}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {n.time}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {n.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border flex items-center gap-2">
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
