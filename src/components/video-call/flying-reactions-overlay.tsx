"use client";

import type { FlyingReactionPayload } from "@/components/video-call/types";
import { motion } from "framer-motion";

interface FlyingReactionsOverlayProps {
  reactions: FlyingReactionPayload[];
  onRemove: (id: string) => void;
  localUsername: string;
}

export function FlyingReactionsOverlay({
  reactions,
  onRemove,
  localUsername,
}: FlyingReactionsOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-5 overflow-hidden">
      {reactions.map((r) => (
        <FlyingEmoji
          key={r.id}
          reaction={r}
          localUsername={localUsername}
          onComplete={() => onRemove(r.id)}
        />
      ))}
    </div>
  );
}

function FlyingEmoji({
  reaction: r,
  localUsername,
  onComplete,
}: {
  reaction: FlyingReactionPayload;
  localUsername: string;
  onComplete: () => void;
}) {
  const d = r.durationMs / 1000;
  const times = [0, 0.12, 0.24, 0.58, 1] as const;
  const label = r.fromUsername === localUsername ? "You" : r.fromUsername;
  return (
    <div
      className="absolute bottom-0 -translate-x-1/2"
      style={{ left: `${r.originX * 100}%` }}
    >
      <motion.div
        className="flex flex-col items-center"
        style={{ willChange: "transform, opacity" }}
        initial={{ x: 0, y: 0, opacity: 0.92, rotate: 0 }}
        animate={{
          x: [0, r.arcX * 0.5, r.arcX, r.driftX * 0.88, r.driftX],
          y: [
            0,
            r.travelY * 0.14,
            r.travelY * 0.42,
            r.travelY * 0.78,
            r.travelY,
          ],
          opacity: [0.92, 1, 1, 1, 0],
          rotate: [
            0,
            r.rotateDeg * 0.55,
            r.rotateDeg * -0.25,
            r.rotateDeg * 0.12,
            0,
          ],
        }}
        transition={{
          duration: d,
          times: [...times],
        }}
        onAnimationComplete={onComplete}
      >
        <motion.span
          className="block text-[2.75rem] leading-none select-none drop-shadow-lg"
          style={{
            willChange: "transform",
            textShadow: "0 1px 2px rgb(0 0 0 / 0.35)",
          }}
          initial={{ scale: 0.35 }}
          animate={{
            scale: [0.35, 1.28, 1.02, 1, 1],
          }}
          transition={{
            duration: d,
            times: [...times],
          }}
          aria-hidden
        >
          {r.emoji}
        </motion.span>
        <span
          className="mb-0.5 max-w-[min(7rem,28vw)] truncate rounded-full bg-black/55 px-2 py-0.5 text-center text-[10px] font-medium leading-tight text-white shadow-sm backdrop-blur-[2px]"
          aria-hidden
        >
          {label}
        </span>
      </motion.div>
    </div>
  );
}
