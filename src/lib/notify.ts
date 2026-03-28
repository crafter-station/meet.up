import { sileo } from "sileo";

function playSubtleSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    osc.onended = () => ctx.close();
  } catch {
    // Audio not available — silent fallback
  }
}

type NotifyOptions = {
  title: string;
  description?: string;
  sound?: boolean;
};

export function notify(
  type: "success" | "error" | "warning" | "info",
  { title, description, sound = true }: NotifyOptions,
) {
  if (sound) playSubtleSound();
  sileo[type]({ title, description });
}

export { sileo };
