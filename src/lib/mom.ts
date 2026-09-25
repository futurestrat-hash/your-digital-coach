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
  return MOM_VARIANTS.find((v) => v.id === id) ?? MOM_VARIANTS[0];
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
