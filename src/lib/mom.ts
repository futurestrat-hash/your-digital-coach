import aProud from "@/assets/mom-a-proud.png";
import aHappy from "@/assets/mom-a-happy.png";
import aSad from "@/assets/mom-a-sad.png";
import aUpset from "@/assets/mom-a-upset.png";
import bProud from "@/assets/mom-b-proud.png";
import bHappy from "@/assets/mom-b-happy.png";
import bSad from "@/assets/mom-b-sad.png";
import bUpset from "@/assets/mom-b-upset.png";
import cProud from "@/assets/mom-c-proud.png";
import cHappy from "@/assets/mom-c-happy.png";
import cSad from "@/assets/mom-c-sad.png";
import cUpset from "@/assets/mom-c-upset.png";

export type MomMood = "happy" | "proud" | "sad" | "upset";
export type MomVariantId = "a" | "b" | "c";

export const MOM_VARIANTS: {
  id: MomVariantId;
  name: string;
  tagline: string;
  art: Record<MomMood, string>;
}[] = [
  {
    id: "a",
    name: "Executive Mom",
    tagline: "Runs your life like a quarterly review.",
    art: { happy: aHappy, proud: aProud, sad: aSad, upset: aUpset },
  },
  {
    id: "b",
    name: "Kitchen Table Mom",
    tagline: "Feeds you, then interrogates you.",
    art: { happy: bHappy, proud: bProud, sad: bSad, upset: bUpset },
  },
  {
    id: "c",
    name: "Coach Mom",
    tagline: "Whistle in one hand, stopwatch in the other.",
    art: { happy: cHappy, proud: cProud, sad: cSad, upset: cUpset },
  },
];

export function getVariant(id: string | null | undefined) {
  return MOM_VARIANTS.find((v) => v.id === id) ?? MOM_VARIANTS[0]!;
}

export function momArt(variantId: string | null | undefined, mood: string | null | undefined) {
  const variant = getVariant(variantId);
  const key = (mood ?? "happy") as MomMood;
  return variant.art[key] ?? variant.art.happy;
}

export const GOAL_PRESETS = [
  { title: "Learning an instrument", category: "skill" },
  { title: "Getting a promotion at work", category: "career" },
  { title: "Eating healthier meals", category: "health" },
  { title: "Moving my body more", category: "health" },
  { title: "Writing every day", category: "craft" },
  { title: "Learning a language", category: "skill" },
  { title: "Studying for an exam", category: "study" },
  { title: "Building a side project", category: "craft" },
];

export const SASS_LABELS: Record<number, string> = {
  1: "Gently teasing",
  2: "Lightly pointed",
  3: "Classic tiger mom",
  4: "Sharp tongued",
  5: "Absolutely merciless",
};

export type MomAnimation = "fade" | "pop" | "slide" | "none";

export const ANIMATION_OPTIONS: { id: MomAnimation; label: string; hint: string }[] = [
  { id: "fade", label: "Fade in", hint: "She materializes, judgmentally." },
  { id: "pop", label: "Pop in", hint: "She appears out of nowhere. Classic." },
  { id: "slide", label: "Slide in", hint: "She enters like she owns the room." },
  { id: "none", label: "No animation", hint: "She is simply… there." },
];

export function animationClass(pref: string | null | undefined) {
  switch (pref) {
    case "pop":
      return "animate-scale-in";
    case "slide":
      return "animate-slide-in-right";
    case "none":
      return "";
    default:
      return "animate-fade-in";
  }
}

export const COMMON_TIMEZONES = [
  "Pacific/Auckland",
  "Australia/Sydney",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/Moscow",
  "Europe/Berlin",
  "Europe/London",
  "Atlantic/Azores",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

export function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function timezoneOptions(current?: string | null) {
  const detected = detectTimezone();
  const set = new Set<string>([detected, ...(current ? [current] : []), ...COMMON_TIMEZONES]);
  return [...set];
}

export function timezoneLabel(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return `${tz.replace(/_/g, " ")} (${parts ?? "UTC"})`;
  } catch {
    return tz;
  }
}
