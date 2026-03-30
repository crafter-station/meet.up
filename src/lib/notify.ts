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

/** Short two-tone chime for “someone wants to join” (host only). */
export function playAdmissionRequestSound() {
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 1.15;
    master.connect(ctx.destination);

    const note = (freq: number, when: number, len: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(master);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, when);
      g.gain.setValueAtTime(0.001, when);
      g.gain.linearRampToValueAtTime(1, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, when + len);
      osc.start(when);
      osc.stop(when + len);
    };

    const t = ctx.currentTime;
    note(784, t, 0.1);
    note(988, t + 0.12, 0.12);

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 320);
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

/** True when the Notifications API is available (secure context, modern browser). */
export function browserNotificationsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    typeof Notification.requestPermission === "function"
  );
}

export type JoinRequestNotificationPermission =
  | NotificationPermission
  | "unsupported";

export function getJoinRequestNotificationPermission(): JoinRequestNotificationPermission {
  if (!browserNotificationsSupported()) return "unsupported";
  return Notification.permission;
}

/** Must be called from a user gesture for best results (browser policy). */
export async function requestJoinRequestNotificationPermission(): Promise<
  Exclude<JoinRequestNotificationPermission, "unsupported">
> {
  if (!browserNotificationsSupported()) return "denied";
  const current = Notification.permission;
  if (current !== "default") return current;
  return Notification.requestPermission();
}

/**
 * Native OS notification when a guest knocks (host only).
 * Skips when the tab is visible so the in-call UI + chime are enough.
 */
export function showJoinRequestBrowserNotification(username: string) {
  if (!browserNotificationsSupported()) return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && !document.hidden) return;

  try {
    new Notification("Join request", {
      body: `${username} wants to enter the meeting.`,
      tag: `meetup-admission:${username}`,
    });
  } catch {
    // Some environments throw despite permission (e.g. policy)
  }
}
