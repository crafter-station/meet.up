"use client";

import { LinkPreviews } from "@/components/ai-elements/link-preview";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/components/video-call/types";
import { notify } from "@/lib/notify";
import { useChat, type UIMessage } from "@ai-sdk/react";
import type { ToolUIPart } from "ai";
import { DefaultChatTransport } from "ai";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  GripHorizontal,
  History,
  LayoutList,
  MessageSquare,
  Minus,
  Paperclip,
  PenLine,
  Search,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const PANEL_WIDTH = 44 * 16;
const DESKTOP_MIN_W = 420;
const DESKTOP_MIN_H = 220;
const MOBILE_DEFAULT_H = 240;
const MOBILE_MIN_H = 120;
const MOBILE_SNAP_CLOSE = 80;
type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const cb = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);
  return mobile;
}

// ── Shortcut badge tooltip ───────────────────────────────────────
function ShortcutTooltip({
  label,
  keys,
  children,
  position = "top",
}: {
  label: string;
  keys?: string[];
  children: React.ReactNode;
  position?: "top" | "bottom";
}) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    const el = triggerRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setCoords({
        x: r.left + r.width / 2,
        y: position === "top" ? r.top : r.bottom,
      });
    }
    setShow(true);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show &&
        createPortal(
          <div
            className="fixed pointer-events-none z-[9999]"
            style={{
              left: coords.x,
              top: position === "top" ? coords.y - 8 : coords.y + 8,
              transform:
                position === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
            }}
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#2a2a2a] border border-white/[0.08] px-3 py-1.5 text-[11px] text-white/70 shadow-lg">
              <span className="tracking-wide">{label}</span>
              {keys?.map((k, i) => (
                <kbd
                  key={i}
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded bg-white/[0.08] px-1 text-[10px] font-medium text-white/50 leading-none"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ── Default suggestion pills ────────────────────────────────────
const DEFAULT_SUGGESTIONS = [
  "Write follow up email",
  "List my todos",
  "Make notes longer",
  "Write tldr",
];

// ── Chat history helpers ────────────────────────────────────────
interface ChatHistoryEntry {
  id: string;
  messages: UIMessage[];
  preview: string;
  createdAt: number;
}

function getChatPreview(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Empty chat";
  const text = first.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ");
  return text.slice(0, 80) || "Empty chat";
}

export interface TranscriptionOverlayHandle {
  sendAiMessage: (text: string) => void;
}

interface TranscriptionOverlayProps {
  username: string;
  roomId: string;
  partialTexts: Record<string, string>;
  messages: ChatMessage[];
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  isOwner?: boolean;
  transcription: {
    isActive: boolean;
    isListening: boolean;
    start: () => void;
    stop: () => void;
  };
  onPinToFeed?: (content: string, title?: string, metadata?: string) => void;
  handleRef?: React.RefObject<TranscriptionOverlayHandle | null>;
}

export function TranscriptionOverlay({
  username,
  roomId,
  partialTexts,
  messages,
  mobileOpen = false,
  onMobileOpenChange,
  isOwner = false,
  transcription,
  onPinToFeed,
  handleRef,
}: TranscriptionOverlayProps) {
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);

  // Desktop drag state
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const isDraggingRef = useRef(false);

  // Resize state
  const resizeRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);
  const desktopResizeRef = useRef<{
    dir: ResizeDirection;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const swipeRef = useRef<{
    startY: number;
    startX: number;
  } | null>(null);

  const [panelPos, setPanelPos] = useState({ left: 24, top: 16 });
  const [desktopSize, setDesktopSize] = useState({
    width: PANEL_WIDTH,
    height: 380,
  });
  const [mobileHeight, setMobileHeight] = useState(MOBILE_DEFAULT_H);

  const panelOpen = mobileOpen;
  const panelVisible = mobileOpen;
  const [minimized, setMinimized] = useState(false);

  // ── Search ──────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen((prev) => {
          if (prev) {
            setSearchQuery("");
            return false;
          }
          return true;
        });
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panelOpen, searchOpen]);

  // ── Copy ────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const copyTranscription = useCallback(() => {
    const transcriptMsgs = messages.filter((m) => m.type === "transcript");
    const text = transcriptMsgs
      .map((m) => `${m.username}: ${m.content}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(
      () => notify("success", { title: "Transcript copied" }),
      () => notify("error", { title: "Failed to copy transcript" }),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [messages]);

  // ── Footer mode & AI chat ──────────────────────────────────────
  type PanelView = "transcript" | "chat";

  const [panelView, setPanelView] = useState<PanelView>("transcript");
  const [aiInput, setAiInput] = useState("");
  const aiInputRef = useRef<HTMLInputElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Build transcript text to send as context
  const transcriptText = useMemo(() => {
    const msgs = messages.filter((m) => m.type === "transcript");
    return msgs.map((m) => `${m.username}: ${m.content}`).join("\n");
  }, [messages]);

  const transcriptRef = useRef(transcriptText);
  transcriptRef.current = transcriptText;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ transcript: transcriptRef.current, roomId }),
      }),
    [roomId],
  );

  const {
    messages: aiMessages,
    sendMessage,
    status: aiStatus,
    setMessages: setAiMessages,
  } = useChat({
    transport,
    onError: (err) => {
      console.error("AI chat error:", err);
      notify("error", { title: "AI chat error", sound: false });
    },
  });

  const isAiLoading = aiStatus === "streaming" || aiStatus === "submitted";

  // ── Chat history ───────────────────────────────────────────────
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const historyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showHistory) return;
    const onPointerDown = (e: PointerEvent) => {
      if (historyDropdownRef.current?.contains(e.target as Node)) return;
      setShowHistory(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showHistory]);

  const { suggestionsTitle, suggestions } = useMemo(() => {
    const lastAssistant = [...aiMessages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant)
      return { suggestionsTitle: null, suggestions: DEFAULT_SUGGESTIONS };
    const toolPart = lastAssistant.parts.find(
      (p) =>
        p.type === "tool-suggestFollowups" &&
        (p as { state: string }).state === "output-available",
    ) as { output?: { title: string; suggestions: string[] } } | undefined;
    return {
      suggestionsTitle: toolPart?.output?.title ?? null,
      suggestions: toolPart?.output?.suggestions ?? DEFAULT_SUGGESTIONS,
    };
  }, [aiMessages]);

  useEffect(() => {
    const el = aiScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [aiMessages.length]);

  const handleChatFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      if (file.size > 10 * 1024 * 1024) {
        notify("error", { title: "File must be under 10 MB" });
        return;
      }
      setPendingFiles((prev) => [...prev, file]);
    },
    [],
  );

  const sendAiMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed && pendingFiles.length === 0) return;
      if (isAiLoading) return;
      setAiInput("");
      setPanelView("chat");

      const filesToSend = [...pendingFiles];
      setPendingFiles([]);

      if (filesToSend.length > 0) {
        // Separate media files (images/PDFs) from text-based files
        const mediaFiles: File[] = [];
        const textContents: string[] = [];

        await Promise.all(
          filesToSend.map(async (file) => {
            if (
              file.type.startsWith("image/") ||
              file.type === "application/pdf"
            ) {
              mediaFiles.push(file);
            } else {
              // Read text-based files and inline their content
              const content = await file.text();
              textContents.push(
                `--- ${file.name} ---\n${content}\n--- end ${file.name} ---`,
              );
            }
          }),
        );

        let messageText = trimmed;
        if (textContents.length > 0) {
          const fileContext = textContents.join("\n\n");
          messageText = messageText
            ? `${messageText}\n\nAttached file contents:\n${fileContext}`
            : `Please analyze the following file contents:\n\n${fileContext}`;
        }
        if (!messageText && mediaFiles.length > 0) {
          messageText = `I've attached ${mediaFiles.length === 1 ? "a file" : `${mediaFiles.length} files`}. Please analyze ${mediaFiles.length === 1 ? "it" : "them"}.`;
        }

        if (mediaFiles.length > 0) {
          const dt = new DataTransfer();
          for (const f of mediaFiles) dt.items.add(f);
          sendMessage({ text: messageText, files: dt.files });
        } else {
          sendMessage({ text: messageText });
        }
      } else {
        sendMessage({ text: trimmed });
      }
    },
    [isAiLoading, sendMessage, pendingFiles],
  );

  // Expose sendAiMessage to parent via ref
  useEffect(() => {
    if (handleRef) handleRef.current = { sendAiMessage };
  }, [handleRef, sendAiMessage]);

  const saveCurrentToHistory = useCallback(() => {
    if (aiMessages.length === 0) return;
    const id = activeChatId ?? crypto.randomUUID();
    const preview = getChatPreview(aiMessages);
    setChatHistory((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      const entry: ChatHistoryEntry = {
        id,
        messages: [...aiMessages],
        preview,
        createdAt: idx >= 0 ? prev[idx].createdAt : Date.now(),
      };
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [...prev, entry];
    });
    return id;
  }, [aiMessages, activeChatId]);

  const newChat = useCallback(() => {
    saveCurrentToHistory();
    setActiveChatId(null);
    setAiMessages([]);
    setPanelView("chat");
    setShowHistory(false);
    setTimeout(() => aiInputRef.current?.focus(), 50);
  }, [saveCurrentToHistory, setAiMessages]);

  const switchToChat = useCallback(
    (id: string) => {
      saveCurrentToHistory();
      const entry = chatHistory.find((e) => e.id === id);
      if (entry) {
        setActiveChatId(id);
        setAiMessages(entry.messages);
        setPanelView("chat");
        setShowHistory(false);
      }
    },
    [saveCurrentToHistory, chatHistory, setAiMessages],
  );

  const deleteHistoryEntry = useCallback((id: string) => {
    setChatHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ── Data ───────────────────────────────────────────────────────
  const transcriptMessages = useMemo(
    () => messages.filter((m) => m.type === "transcript"),
    [messages],
  );
  const activePartials = useMemo(
    () => Object.entries(partialTexts).filter(([, t]) => t),
    [partialTexts],
  );

  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const query = normalize(searchQuery.trim());
  const filteredTranscripts = useMemo(
    () =>
      query
        ? transcriptMessages.filter(
            (m) =>
              normalize(m.content).includes(query) ||
              normalize(m.username).includes(query),
          )
        : transcriptMessages,
    [transcriptMessages, query],
  );

  const groupedTranscripts = useMemo(() => {
    const groups: { speaker: string; messages: ChatMessage[] }[] = [];
    for (const msg of filteredTranscripts) {
      const last = groups[groups.length - 1];
      if (last && last.speaker === msg.username) {
        last.messages.push(msg);
      } else {
        groups.push({ speaker: msg.username, messages: [msg] });
      }
    }
    return groups;
  }, [filteredTranscripts]);

  const scrollRef = useRef<HTMLDivElement>(null);
  /** Set when user minimizes transcript; restored on next expand. `null` = never minimized this session. */
  const savedTranscriptScrollRef = useRef<number | null>(null);
  /** After first transcript layout, skip default jump-to-end unless restoring from minimize. */
  const transcriptScrollBootstrappedRef = useRef(false);

  const saveTranscriptScrollAndMinimize = useCallback(() => {
    const el = scrollRef.current;
    if (el) savedTranscriptScrollRef.current = el.scrollTop;
    setMinimized(true);
  }, []);

  useLayoutEffect(() => {
    if (minimized) return;
    if (panelView !== "transcript") return;
    const el = scrollRef.current;
    if (!el) return;
    if (savedTranscriptScrollRef.current !== null) {
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      const y = Math.min(Math.max(0, savedTranscriptScrollRef.current), max);
      savedTranscriptScrollRef.current = null;
      el.scrollTop = y;
      return;
    }
    if (!transcriptScrollBootstrappedRef.current) {
      el.scrollTop = el.scrollHeight;
      transcriptScrollBootstrappedRef.current = true;
    }
  }, [minimized, panelView]);

  // ── Desktop drag ───────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      isDraggingRef.current = true;
      const parent = panelRef.current?.parentElement;
      if (!parent) return;
      const pr = parent.getBoundingClientRect();
      const nr = panelRef.current!.getBoundingClientRect();
      setPanelPos({
        left: Math.min(
          Math.max(12, drag.startLeft + (e.clientX - drag.startX)),
          pr.width - nr.width - 12,
        ),
        top: Math.min(
          Math.max(12, drag.startTop + (e.clientY - drag.startY)),
          pr.height - nr.height - 12,
        ),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // ── Resize ─────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const desktopResize = desktopResizeRef.current;
      if (desktopResize && !isMobile) {
        const parent = panelRef.current?.parentElement;
        const pr = parent?.getBoundingClientRect();
        const parentW = pr?.width ?? 1200;
        const parentH = pr?.height ?? 800;
        const dx = e.clientX - desktopResize.startX;
        const dy = e.clientY - desktopResize.startY;
        let nextW = desktopResize.startW;
        let nextH = desktopResize.startH;
        let nextLeft = desktopResize.startLeft;
        let nextTop = desktopResize.startTop;
        if (desktopResize.dir.includes("e")) nextW += dx;
        if (desktopResize.dir.includes("s")) nextH += dy;
        if (desktopResize.dir.includes("w")) {
          nextW -= dx;
          nextLeft += dx;
        }
        if (desktopResize.dir.includes("n")) {
          nextH -= dy;
          nextTop += dy;
        }
        if (nextW < DESKTOP_MIN_W) {
          if (desktopResize.dir.includes("w"))
            nextLeft -= DESKTOP_MIN_W - nextW;
          nextW = DESKTOP_MIN_W;
        }
        if (nextH < DESKTOP_MIN_H) {
          if (desktopResize.dir.includes("n")) nextTop -= DESKTOP_MIN_H - nextH;
          nextH = DESKTOP_MIN_H;
        }
        nextLeft = Math.max(12, Math.min(nextLeft, parentW - nextW - 12));
        nextTop = Math.max(12, Math.min(nextTop, parentH - nextH - 12));
        nextW = Math.min(nextW, parentW - nextLeft - 12);
        nextH = Math.min(nextH, parentH - nextTop - 12);
        setPanelPos({ left: nextLeft, top: nextTop });
        setDesktopSize({ width: nextW, height: nextH });
      }
      const swipe = swipeRef.current;
      if (swipe && isMobile) {
        const deltaY = e.clientY - swipe.startY;
        const deltaX = e.clientX - swipe.startX;
        if (deltaY > 90 && Math.abs(deltaY) > Math.abs(deltaX)) {
          onMobileOpenChange?.(false);
          swipeRef.current = null;
        }
      }
      const r = resizeRef.current;
      if (!r) return;
      const delta = r.startY - e.clientY;
      const parent = panelRef.current?.parentElement;
      const maxH = parent ? parent.getBoundingClientRect().height - 12 : 600;
      setMobileHeight(
        Math.min(Math.max(MOBILE_MIN_H, r.startHeight + delta), maxH),
      );
    };
    const onUp = (e: PointerEvent) => {
      swipeRef.current = null;
      desktopResizeRef.current = null;
      const r = resizeRef.current;
      if (!r) return;
      const delta = r.startY - e.clientY;
      resizeRef.current = null;
      if (r.startHeight + delta < MOBILE_SNAP_CLOSE) {
        onMobileOpenChange?.(false);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isMobile, onMobileOpenChange]);

  const desktopResizeHandles: Array<{
    dir: ResizeDirection;
    className: string;
    cursor: string;
  }> = [
    { dir: "n", className: "top-0 left-2 right-2 h-1.5", cursor: "ns-resize" },
    {
      dir: "s",
      className: "bottom-0 left-2 right-2 h-1.5",
      cursor: "ns-resize",
    },
    {
      dir: "e",
      className: "right-0 top-2 bottom-2 w-1.5",
      cursor: "ew-resize",
    },
    { dir: "w", className: "left-0 top-2 bottom-2 w-1.5", cursor: "ew-resize" },
    { dir: "ne", className: "top-0 right-0 h-3 w-3", cursor: "nesw-resize" },
    { dir: "nw", className: "top-0 left-0 h-3 w-3", cursor: "nwse-resize" },
    { dir: "se", className: "bottom-0 right-0 h-3 w-3", cursor: "nwse-resize" },
    { dir: "sw", className: "bottom-0 left-0 h-3 w-3", cursor: "nesw-resize" },
  ];

  // ── Suggestion pills component ─────────────────────────────────
  const suggestionPills = (
    <div className="shrink-0 px-3 py-1.5">
      {suggestionsTitle && (
        <p className="text-[10px] text-muted-foreground/60 mb-1">
          {suggestionsTitle}
        </p>
      )}
      <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((s) => (
          <button
            key={s}
            className="flex items-center gap-1 whitespace-nowrap rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            onClick={() => sendAiMessage(s)}
          >
            <PenLine className="h-3 w-3" />
            {s}
          </button>
        ))}
      </div>
    </div>
  );

  // ── AI chat input bar ──────────────────────────────────────────
  const chatInputBar = (
    <div className="px-3 pb-2 pt-1 shrink-0">
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5 px-1">
          {pendingFiles.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-1 rounded-full bg-muted/50 border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <Paperclip className="h-2.5 w-2.5 shrink-0" />
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button
                className="hover:text-foreground"
                onClick={() =>
                  setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                }
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-full border border-[#6b7a2f]/60 bg-muted/30 px-4 py-1.5">
        <input
          ref={aiInputRef}
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendAiMessage(aiInput);
            }
          }}
          placeholder="Ask anything"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
        />
        <span className="text-[11px] text-muted-foreground/50">Auto</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
        <button
          className="text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-30"
          onClick={() => chatFileInputRef.current?.click()}
        >
          <Paperclip className="h-3.5 w-3.5" />
        </button>
        <input
          ref={chatFileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.txt,.md,.csv,.json"
          onChange={handleChatFileSelect}
        />
        <button
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6b7a2f] text-white hover:bg-[#7d8e36] transition-colors disabled:opacity-30"
          disabled={
            (!aiInput.trim() && pendingFiles.length === 0) || isAiLoading
          }
          onClick={() => sendAiMessage(aiInput)}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────

  if (!panelOpen) return null;

  return (
    <div
      ref={panelRef}
      className={[
        "absolute z-20 flex flex-col overflow-hidden",
        "border border-border/50 bg-background/95 shadow-2xl backdrop-blur-xl",
        isMobile ? "bottom-0 inset-x-0 rounded-t-2xl" : "rounded-xl",
        "transition-[transform,opacity] duration-200 ease-out",
        isMobile
          ? panelVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
          : panelVisible
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95",
      ].join(" ")}
      style={{
        transformOrigin: isMobile ? "bottom center" : "top center",
        ...(isMobile
          ? { height: minimized ? "auto" : mobileHeight }
          : {
              left: panelPos.left,
              top: minimized ? "auto" : panelPos.top,
              bottom: minimized ? 12 : "auto",
              width: desktopSize.width,
              height: minimized ? "auto" : desktopSize.height,
            }),
      }}
      onPointerDown={(e) => {
        if (!isMobile || e.pointerType !== "touch") return;
        swipeRef.current = { startY: e.clientY, startX: e.clientX };
      }}
    >
      {/* Mobile resize handle */}
      {!minimized && isMobile && (
        <div
          className="flex justify-center py-1.5 cursor-ns-resize touch-none shrink-0"
          onPointerDown={(e) => {
            e.stopPropagation();
            resizeRef.current = {
              startY: e.clientY,
              startHeight: mobileHeight,
            };
            e.preventDefault();
          }}
        >
          <GripHorizontal className="h-4 w-4 text-muted-foreground/40" />
        </div>
      )}
      {/* Desktop resize handles */}
      {!minimized &&
        !isMobile &&
        desktopResizeHandles.map((h) => (
          <div
            key={h.dir}
            className={`absolute ${h.className} z-30`}
            style={{ cursor: h.cursor }}
            onPointerDown={(e) => {
              e.stopPropagation();
              desktopResizeRef.current = {
                dir: h.dir,
                startX: e.clientX,
                startY: e.clientY,
                startW: desktopSize.width,
                startH: desktopSize.height,
                startLeft: panelPos.left,
                startTop: panelPos.top,
              };
              e.preventDefault();
            }}
          />
        ))}

      {/* ── Header ── */}
      {minimized ? (
        <div
          className={[
            "flex items-center gap-2 px-3 py-2 shrink-0",
            !isMobile ? "cursor-move" : "",
          ].join(" ")}
          onPointerDown={(e) => {
            if (isMobile) return;
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              startLeft: panelPos.left,
              startTop: panelPos.top,
            };
          }}
        >
          <span className="text-xs text-muted-foreground">Transcription</span>
          <div className="flex-1" />
          <button
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/5 transition-colors"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMinimized(false)}
            title="Expand"
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
        </div>
      ) : panelView === "transcript" ? (
        <div
          className={[
            "flex items-center gap-1 px-3 py-2 shrink-0",
            !isMobile ? "cursor-move" : "",
          ].join(" ")}
          onPointerDown={(e) => {
            if (isMobile) return;
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              startLeft: panelPos.left,
              startTop: panelPos.top,
            };
          }}
        >
          {searchOpen ? (
            <div
              className="flex-1 flex items-center gap-1.5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find in transcript..."
                className="h-7 text-xs border-none bg-transparent shadow-none focus-visible:ring-0 px-0"
              />
              <button
                className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <ShortcutTooltip
                label="Find in transcript"
                keys={["\u2318", "F"]}
              >
                <button
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/5 transition-colors"
                  onClick={() => setSearchOpen(true)}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Search className="h-4 w-4" />
                </button>
              </ShortcutTooltip>
              <div className="flex-1 h-6" />
              <ShortcutTooltip label="Copy transcript" keys={["\u2318", "C"]}>
                <button
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/5 transition-colors"
                  onClick={copyTranscription}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </ShortcutTooltip>
              <button
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/5 transition-colors"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={saveTranscriptScrollAndMinimize}
                title="Minimize"
              >
                <Minus className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ) : (
        /* ── Chat header ── */
        <div
          className={[
            "flex items-center gap-2 px-3 py-2 shrink-0",
            !isMobile ? "cursor-move" : "",
          ].join(" ")}
          onPointerDown={(e) => {
            if (isMobile) return;
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              startLeft: panelPos.left,
              startTop: panelPos.top,
            };
          }}
        >
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              setPanelView("transcript");
            }}
          >
            <span className="text-sm font-medium text-foreground">
              Back to transcription
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          <div className="flex-1" />
          {chatHistory.length > 0 && (
            <div className="relative" ref={historyDropdownRef}>
              <button
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/5 transition-colors"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setShowHistory((prev) => !prev)}
                title="Chat history"
              >
                <History className="h-4 w-4" />
              </button>
              {showHistory && (
                <div className="absolute right-0 top-full mt-1 w-64 max-h-52 overflow-y-auto rounded-lg border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl z-50">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider border-b border-border/30">
                    Previous chats
                  </div>
                  {chatHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className={`group flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/30 transition-colors cursor-pointer ${
                        entry.id === activeChatId
                          ? "text-foreground bg-muted/20"
                          : "text-muted-foreground"
                      }`}
                      onClick={() => switchToChat(entry.id)}
                    >
                      <MessageSquare className="h-3 w-3 shrink-0 opacity-50" />
                      <span className="flex-1 truncate">{entry.preview}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5 rounded transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryEntry(entry.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={newChat}
          >
            <PenLine className="h-3 w-3" />
            New chat
          </button>
          <button
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/5 transition-colors"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onMobileOpenChange?.(false)}
            title="Minimize"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Content area ── */}
      {minimized ? null : panelView === "transcript" ? (
        /* Transcription messages */
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-2 text-[13px]
          [scrollbar-width:thin]
          [scrollbar-color:rgba(255,255,255,0.1)_transparent]
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-white/10"
        >
          {activePartials.length === 0 && groupedTranscripts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Search className="h-5 w-5 text-muted-foreground/30" />
              <p className="text-muted-foreground/40 text-xs">
                Transcription will appear here when someone speaks.
              </p>
            </div>
          )}
          {groupedTranscripts.map((group) => {
            const isMe = group.speaker === username;
            return (
              <div key={group.messages[0].id} className="py-1">
                <p
                  className={`text-[10px] text-muted-foreground/60 mb-0.5 ${isMe ? "text-right pr-1" : "pl-1"}`}
                >
                  {group.speaker}
                </p>
                <div
                  className={`flex flex-col gap-px ${isMe ? "items-end" : "items-start"}`}
                >
                  {group.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[92%] rounded-md px-2.5 py-1 ${
                        isMe
                          ? "bg-primary/10 text-foreground"
                          : "bg-muted/50 text-foreground"
                      }`}
                    >
                      <p className="leading-snug">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {activePartials.map(([speaker, text]) => {
            const isMe = speaker === username;
            return (
              <div key={`partial-${speaker}`} className="py-1">
                <p
                  className={`text-[10px] text-muted-foreground/60 mb-0.5 ${isMe ? "text-right pr-1" : "pl-1"}`}
                >
                  {speaker} ...
                </p>
                <div
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[92%] rounded-md border border-dashed border-border/40 bg-muted/20 px-2.5 py-1">
                    <p className="leading-snug italic text-foreground/60">
                      {text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* AI chat messages */
        <div
          ref={aiScrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 text-[13px]
          [scrollbar-width:thin]
          [scrollbar-color:rgba(255,255,255,0.1)_transparent]
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-white/10"
        >
          <div className="space-y-4 py-2">
            {aiMessages.map((msg, msgIdx) => {
              const isLastMsg = msgIdx === aiMessages.length - 1;

              return (
                <Message key={msg.id} from={msg.role}>
                  <MessageContent>
                    {msg.parts.map((part, pi) => {
                      const key = `${msg.id}-${pi}`;

                      if (part.type === "reasoning") {
                        const rp = part as {
                          type: "reasoning";
                          text: string;
                          state?: "streaming" | "done";
                        };
                        return (
                          <Reasoning
                            key={key}
                            isStreaming={rp.state === "streaming"}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{rp.text}</ReasoningContent>
                          </Reasoning>
                        );
                      }

                      if (part.type === "text") {
                        if (msg.role === "assistant") {
                          const isLastPart = pi === msg.parts.length - 1;
                          const streaming =
                            aiStatus === "streaming" && isLastMsg && isLastPart;
                          return (
                            <div key={key}>
                              <MessageResponse
                                mode={streaming ? "streaming" : "static"}
                              >
                                {part.text}
                              </MessageResponse>
                              {!streaming && (
                                <LinkPreviews content={part.text} />
                              )}
                            </div>
                          );
                        }
                        return (
                          <MessageResponse key={key} mode="static">
                            {part.text}
                          </MessageResponse>
                        );
                      }

                      if (part.type === "file") {
                        const fp = part as {
                          type: "file";
                          mediaType: string;
                          url: string;
                        };
                        if (fp.mediaType.startsWith("image/")) {
                          return (
                            <img
                              key={key}
                              src={fp.url}
                              alt="Attached image"
                              className="max-w-full max-h-48 rounded-lg object-contain"
                            />
                          );
                        }
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-1.5 rounded-md bg-muted/30 border border-border/40 px-2.5 py-1.5 text-xs text-muted-foreground"
                          >
                            <Paperclip className="h-3 w-3 shrink-0" />
                            <span>
                              {fp.mediaType === "application/pdf"
                                ? "PDF attachment"
                                : "File attachment"}
                            </span>
                          </div>
                        );
                      }

                      if (part.type === "tool-suggestFollowups") return null;

                      if (part.type.startsWith("tool-")) {
                        const tp = part as {
                          type: `tool-${string}`;
                          state: ToolUIPart["state"];
                          input: unknown;
                          output?: unknown;
                          errorText?: string;
                        };
                        const toolName = part.type.replace("tool-", "");
                        return (
                          <Tool key={key} defaultOpen={false}>
                            <ToolHeader
                              title={formatToolName(toolName)}
                              type={tp.type}
                              state={tp.state}
                            />
                            <ToolContent>
                              <ToolInput input={tp.input} />
                              {tp.state === "output-available" && (
                                <ToolOutput
                                  output={tp.output}
                                  errorText={undefined}
                                />
                              )}
                              {tp.state === "output-error" && (
                                <ToolOutput
                                  output={undefined}
                                  errorText={
                                    tp.errorText ?? "An error occurred"
                                  }
                                />
                              )}
                            </ToolContent>
                          </Tool>
                        );
                      }

                      return null;
                    })}
                  </MessageContent>
                  {msg.role === "assistant" && !isAiLoading && onPinToFeed && (
                    <button
                      className="flex items-center gap-1 self-start rounded-md border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                      onClick={() => {
                        const text = msg.parts
                          .filter(
                            (p): p is { type: "text"; text: string } =>
                              p.type === "text",
                          )
                          .map((p) => p.text)
                          .join("\n");
                        const toolParts = msg.parts.filter((p) =>
                          p.type.startsWith("tool-"),
                        );
                        const title =
                          toolParts.length > 0
                            ? formatToolName(
                                toolParts[0].type.replace("tool-", ""),
                              )
                            : text.slice(0, 50);
                        onPinToFeed(
                          text,
                          title,
                          toolParts.length > 0
                            ? JSON.stringify(toolParts)
                            : undefined,
                        );
                      }}
                    >
                      <LayoutList className="h-3 w-3" />
                      Add to meeting
                    </button>
                  )}
                </Message>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      {panelView === "chat" ? (
        /* Chat view footer: suggestions + input */
        <div className="shrink-0 border-t border-border/30">
          {suggestionPills}
          {chatInputBar}
        </div>
      ) : (
        /* Always visible: Resume + Ask anything + quick action */
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border/30 shrink-0">
          <div className="group relative flex items-center gap-[3px] px-2 py-1.5 shrink-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`inline-block w-[1.5px] rounded-full bg-muted-foreground/40 ${transcription.isListening ? "animate-audio-bar" : "h-[3px]"}`}
                style={{
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 whitespace-nowrap rounded-md bg-muted/80 backdrop-blur-sm border border-border/30 px-2 py-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Transcription active
            </span>
          </div>
          <button
            className="flex-1 flex items-center gap-2 rounded-full bg-muted/30 border border-border/30 px-4 py-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
            onClick={() => {
              setPanelView("chat");
              setTimeout(() => aiInputRef.current?.focus(), 50);
            }}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            Ask anything
          </button>
          <button
            className="flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            onClick={() => sendAiMessage("Write follow up email")}
          >
            <PenLine className="h-3 w-3" />
            Write follow up email
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tool name formatting ────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  webSearch: "Web Search",
  getCurrentTime: "Current Time",
  getCurrentMeetingCode: "Meeting Code",
  getMeetingParticipantEmails: "Participant Emails",
  scheduleNewMeeting: "Schedule Meeting",
};

function formatToolName(toolName: string): string {
  return (
    TOOL_LABELS[toolName] ??
    toolName
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim()
  );
}
