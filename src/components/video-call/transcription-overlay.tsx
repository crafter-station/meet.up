"use client";

import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/components/video-call/types";
import { ChevronDown, GripHorizontal, Mic, MicOff, Move } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "transcription-overlay:expanded";
const PANEL_WIDTH = 38 * 16;
const DESKTOP_MIN_W = 420;
const DESKTOP_MIN_H = 220;
const MOBILE_DEFAULT_H = 240;
const MOBILE_MIN_H = 120;
const MOBILE_SNAP_CLOSE = 80;
type ResizeDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

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

function readExpandedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

interface TranscriptionOverlayProps {
  username: string;
  partialTexts: Record<string, string>;
  messages: ChatMessage[];
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  transcription: {
    isActive: boolean;
    isListening: boolean;
    start: () => void;
    stop: () => void;
  };
}

export function TranscriptionOverlay({
  username,
  partialTexts,
  messages,
  mobileOpen = false,
  onMobileOpenChange,
  transcription,
}: TranscriptionOverlayProps) {
  const isMobile = useIsMobile();
  const pillRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Desktop drag state (shared for pill + panel)
  const dragRef = useRef<{
    target: "pill" | "panel";
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const isDraggingRef = useRef(false);

  // Mobile resize state
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

  const [pillPos, setPillPos] = useState({ left: 24, top: 16 });
  const [panelPos, setPanelPos] = useState({ left: 24, top: 16 });
  const [desktopSize, setDesktopSize] = useState({ width: PANEL_WIDTH, height: 256 });
  const [mobileHeight, setMobileHeight] = useState(MOBILE_DEFAULT_H);
  const [isExpanded, setIsExpanded] = useState(readExpandedPreference);
  const [visible, setVisible] = useState(readExpandedPreference);
  // Controlled open state from CallControls (mobile + desktop)
  const panelOpen = mobileOpen;
  const panelVisible = mobileOpen || visible;

  // ── Data ───────────────────────────────────────────────────────

  const transcriptMessages = useMemo(
    () => messages.filter((m) => m.type === "transcript"),
    [messages],
  );
  const activePartials = useMemo(
    () => Object.entries(partialTexts).filter(([, t]) => t),
    [partialTexts],
  );
  const recentTranscripts = useMemo(
    () => transcriptMessages.slice(-5).reverse(),
    [transcriptMessages],
  );
  const overlayTranscripts = useMemo(
    () => (isMobile ? transcriptMessages : recentTranscripts),
    [isMobile, transcriptMessages, recentTranscripts],
  );
  const latestPartial = useMemo(
    () => activePartials[0] ?? null,
    [activePartials],
  );

  const [lastSeenCount, setLastSeenCount] = useState(0);
  const unseenCount = useMemo(() => {
    if (panelOpen) return 0;
    return Math.max(0, transcriptMessages.length - lastSeenCount);
  }, [panelOpen, transcriptMessages.length, lastSeenCount]);

  // ── Persist preference ─────────────────────────────────────────

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, isExpanded ? "true" : "false");
    } catch {}
  }, [isExpanded]);

  // ── Center pill on mount ───────────────────────────────────────

  useEffect(() => {
    const pill = pillRef.current;
    const parent = pill?.parentElement;
    if (!pill || !parent) return;
    const pr = parent.getBoundingClientRect();
    const nr = pill.getBoundingClientRect();
    setPillPos({
      left: Math.max(12, (pr.width - nr.width) / 2),
      top: 16,
    });
  }, []);

  // ── Desktop drag (pill + panel) ────────────────────────────────

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      isDraggingRef.current = true;

      const node = drag.target === "pill" ? pillRef.current : panelRef.current;
      const parent = node?.parentElement;
      if (!node || !parent) return;

      const pr = parent.getBoundingClientRect();
      const nr = node.getBoundingClientRect();
      const pos = {
        left: Math.min(
          Math.max(12, drag.startLeft + (e.clientX - drag.startX)),
          pr.width - nr.width - 12,
        ),
        top: Math.min(
          Math.max(12, drag.startTop + (e.clientY - drag.startY)),
          pr.height - nr.height - 12,
        ),
      };

      if (drag.target === "pill") setPillPos(pos);
      else setPanelPos(pos);
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

  // ── Mobile resize ──────────────────────────────────────────────

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

        if (desktopResize.dir.includes("e")) {
          nextW = desktopResize.startW + dx;
        }
        if (desktopResize.dir.includes("s")) {
          nextH = desktopResize.startH + dy;
        }
        if (desktopResize.dir.includes("w")) {
          nextW = desktopResize.startW - dx;
          nextLeft = desktopResize.startLeft + dx;
        }
        if (desktopResize.dir.includes("n")) {
          nextH = desktopResize.startH - dy;
          nextTop = desktopResize.startTop + dy;
        }

        // Clamp against min size first.
        if (nextW < DESKTOP_MIN_W) {
          if (desktopResize.dir.includes("w")) {
            nextLeft -= DESKTOP_MIN_W - nextW;
          }
          nextW = DESKTOP_MIN_W;
        }
        if (nextH < DESKTOP_MIN_H) {
          if (desktopResize.dir.includes("n")) {
            nextTop -= DESKTOP_MIN_H - nextH;
          }
          nextH = DESKTOP_MIN_H;
        }

        // Clamp panel within parent bounds.
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
        // If vertical downward gesture dominates, close sheet.
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
      const finalH = r.startHeight + delta;
      resizeRef.current = null;
      if (finalH < MOBILE_SNAP_CLOSE) {
        onMobileOpenChange?.(false);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isMobile, onMobileOpenChange, panelPos.left, panelPos.top]);

  const desktopResizeHandles: Array<{
    dir: ResizeDirection;
    className: string;
    cursor: string;
  }> = [
    { dir: "n", className: "top-0 left-2 right-2 h-2", cursor: "ns-resize" },
    { dir: "s", className: "bottom-0 left-2 right-2 h-2", cursor: "ns-resize" },
    { dir: "e", className: "right-0 top-2 bottom-2 w-2", cursor: "ew-resize" },
    { dir: "w", className: "left-0 top-2 bottom-2 w-2", cursor: "ew-resize" },
    { dir: "ne", className: "top-0 right-0 h-3 w-3", cursor: "nesw-resize" },
    { dir: "nw", className: "top-0 left-0 h-3 w-3", cursor: "nwse-resize" },
    { dir: "se", className: "bottom-0 right-0 h-3 w-3", cursor: "nwse-resize" },
    { dir: "sw", className: "bottom-0 left-0 h-3 w-3", cursor: "nesw-resize" },
  ];

  // ── Expand / Collapse ──────────────────────────────────────────

  const handleExpand = () => {
    if (isDraggingRef.current) return;
    setLastSeenCount(transcriptMessages.length);
    const parent =
      pillRef.current?.parentElement ?? panelRef.current?.parentElement;
    if (parent) {
      const pr = parent.getBoundingClientRect();
      const w = Math.min(0.92 * pr.width, PANEL_WIDTH);
      setPanelPos({ left: Math.max(12, (pr.width - w) / 2), top: 16 });
    }
    setMobileHeight(MOBILE_DEFAULT_H);
    setIsExpanded(true);
    requestAnimationFrame(() => setVisible(true));
  };

  const handleCollapse = () => {
    onMobileOpenChange?.(false);
  };

  // ── Shared pieces ──────────────────────────────────────────────

  const statusDot = transcription.isActive ? (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${
        transcription.isListening
          ? "bg-green-500 animate-pulse"
          : "bg-yellow-500"
      }`}
    />
  ) : (
    <MicOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
  );
  const statusLabel = !transcription.isActive
    ? "Off"
    : transcription.isListening
      ? "Writing..."
      : "Waiting";
  const statusToneClass = !transcription.isActive
    ? "text-muted-foreground"
    : transcription.isListening
      ? "text-green-400"
      : "text-yellow-400";

  const sttButton = (
    <Button
      variant={transcription.isActive ? "destructive" : "secondary"}
      size="sm"
      className="h-7 gap-1.5"
      onClick={() =>
        transcription.isActive ? transcription.stop() : transcription.start()
      }
    >
      {transcription.isActive ? (
        <>
          <MicOff className="h-3.5 w-3.5" />
          STT
        </>
      ) : (
        <>
          <Mic className="h-3.5 w-3.5" />
          STT
        </>
      )}
    </Button>
  );

  const transcriptContent = (
    <div
      className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm
      [scrollbar-color:var(--primary)_transparent]
      [scrollbar-width:thin]
      [&::-webkit-scrollbar]:w-2
      [&::-webkit-scrollbar-track]:bg-transparent
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-thumb]:bg-slate-600/80
      [&::-webkit-scrollbar-thumb:hover]:bg-slate-500"
    >
      {!latestPartial && overlayTranscripts.length === 0 && (
        <p className="text-muted-foreground">
          La transcripcion aparecera aqui cuando alguien hable.
        </p>
      )}
      {latestPartial && (
        <div
          key={`partial-${latestPartial[0]}`}
          className={`rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 ${
            latestPartial[0] === username ? "text-right" : ""
          }`}
        >
          <p className="mb-1 text-xs text-muted-foreground">
            {latestPartial[0]} - escuchando...
          </p>
          <p className="italic text-foreground/90">{latestPartial[1]}</p>
        </div>
      )}
      {overlayTranscripts.map((msg) => (
        <div
          key={msg.id}
          className={`rounded-lg border border-border/70 bg-background/50 px-3 py-2 ${
            msg.username === username ? "text-right" : ""
          }`}
        >
          <p className="mb-1 text-xs text-muted-foreground">
            {msg.username} - transcript
          </p>
          <p>{msg.content}</p>
        </div>
      ))}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────

  return (
    <>
      {/* ── Pill (collapsed) ── */}
      {false && !panelOpen && !isMobile && (
        <div
          ref={pillRef}
          className="absolute z-20 bottom-3 left-1/2 -translate-x-1/2 md:bottom-auto md:left-auto md:translate-x-0"
          style={
            !isMobile ? { left: pillPos.left, top: pillPos.top } : undefined
          }
        >
          <div
            className="flex cursor-pointer md:cursor-move select-none items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-2 shadow-lg backdrop-blur-md hover:shadow-xl active:opacity-80"
            onPointerDown={(e) => {
              if (isMobile) return;
              isDraggingRef.current = false;
              dragRef.current = {
                target: "pill",
                startX: e.clientX,
                startY: e.clientY,
                startLeft: pillPos.left,
                startTop: pillPos.top,
              };
            }}
            onClick={() => {
              if (!isDraggingRef.current) handleExpand();
            }}
          >
            {statusDot}
            <span className="text-sm font-medium">Transcription</span>
            <span className={`text-xs ${statusToneClass}`}>{statusLabel}</span>
            {unseenCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                +{unseenCount}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* ── Panel (expanded) ── */}
      {panelOpen && (
        <div
          ref={panelRef}
          className={[
            "absolute z-20 flex flex-col overflow-hidden",
            "border border-border/70 bg-background/90 shadow-xl backdrop-blur-md",
            // Mobile: bottom sheet
            isMobile
              ? "bottom-0 inset-x-0 rounded-t-2xl"
              : "rounded-2xl",
            // Animation
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
              ? { height: mobileHeight }
              : {
                  left: panelPos.left,
                  top: panelPos.top,
                  width: desktopSize.width,
                  height: desktopSize.height,
                }),
          }}
          onPointerDown={(e) => {
            if (!isMobile || e.pointerType !== "touch") return;
            swipeRef.current = { startY: e.clientY, startX: e.clientX };
          }}
        >
          {/* Mobile resize handle */}
          {isMobile && (
            <div
              className="flex justify-center py-2 cursor-ns-resize touch-none shrink-0"
              onPointerDown={(e) => {
                e.stopPropagation();
                resizeRef.current = {
                  startY: e.clientY,
                  startHeight: mobileHeight,
                };
                e.preventDefault();
              }}
            >
              <GripHorizontal className="h-5 w-5 text-muted-foreground/50" />
            </div>
          )}
          {!isMobile &&
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

          {/* Header */}
          <div
            className={[
              "flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2 shrink-0",
              !isMobile ? "cursor-move" : "",
            ].join(" ")}
            onPointerDown={(e) => {
              if (isMobile) return;
              dragRef.current = {
                target: "panel",
                startX: e.clientX,
                startY: e.clientY,
                startLeft: panelPos.left,
                startTop: panelPos.top,
              };
            }}
          >
            <div className="flex items-center gap-2 text-sm">
              {!isMobile && (
                <Move className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              {statusDot}
              <span className="font-medium">Transcription</span>
              <span className={`text-xs ${statusToneClass}`}>
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleCollapse}
                title="Minimize"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              {sttButton}
            </div>
          </div>

          {transcriptContent}
        </div>
      )}
    </>
  );
}
