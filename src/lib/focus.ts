export type FocusPreset = { minutes: number; label: string; blurb: string };

export const FOCUS_PRESETS: FocusPreset[] = [
  { minutes: 15, label: "Warm-up", blurb: "For when you need proof that you can start." },
  { minutes: 25, label: "The sit-down", blurb: "Phone away, water poured, chair stays warm." },
  { minutes: 45, label: "Serious effort", blurb: "The kind the aunties hear about." },
];

export const MIN_FOCUS_MINUTES = 5;
export const MAX_FOCUS_MINUTES = 180;

export function clampFocusMinutes(value: number) {
  if (!Number.isFinite(value)) return MIN_FOCUS_MINUTES;
  return Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, Math.round(value)));
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export type FocusVerdict = "stayed" | "peeked" | "left";

/** Anything past 15s off-tab is a wander; past 90s she calls it what it is. */
export function awayVerdict(awaySeconds: number) {
  if (awaySeconds <= 15) return "stayed" as FocusVerdict;
  if (awaySeconds <= 90) return "peeked" as FocusVerdict;
  return "left" as FocusVerdict;
}

export const FOCUS_VERDICT_MOOD: Record<FocusVerdict, "happy" | "proud" | "sad" | "upset"> = {
  stayed: "proud",
  peeked: "sad",
  left: "upset",
};

export function focusNote(label: string, verdict: FocusVerdict) {
  const drift = verdict === "stayed" ? "" : verdict === "peeked" ? " · stepped away" : " · left the page";
  return `Focus session · ${label}${drift}`;
}
