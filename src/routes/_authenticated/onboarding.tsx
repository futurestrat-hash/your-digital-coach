import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  GOAL_PRESETS,
  MOM_VARIANTS,
  SASS_LABELS,
  detectTimezone,
  timezoneLabel,
  timezoneOptions,
  type MomVariantId,
} from "@/lib/mom";
import { cn } from "@/lib/utils";
import { uniqueGoalTitles } from "@/lib/goals";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Adopt your tiger mom — Tiger Mom" },
      { name: "description", content: "Pick your tiger mom, name her, and tell her your goal." },
      { property: "og:title", content: "Adopt your tiger mom" },
      { property: "og:description", content: "Choose her look, her sass level, and your goal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submitting = useRef(false);
  const { userId } = Route.useRouteContext();
  const [step, setStep] = useState(0);
  const [variant, setVariant] = useState<MomVariantId>("a");
  const [momName, setMomName] = useState("Mom");
  const [sass, setSass] = useState(3);
  const [timezone, setTimezone] = useState(detectTimezone);
  const [picked, setPicked] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);

  const goals = uniqueGoalTitles([...picked, customGoal]);

  function togglePreset(title: string) {
    setPicked((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title].slice(0, 3),
    );
  }

  async function finish() {
    if (submitting.current) return;
    if (goals.length === 0) {
      toast.error("Give her at least one goal to nag you about.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const { data: currentProfile, error: readError } = await supabase
        .from("profiles").select("*").eq("id", userId).single();
      if (readError) throw readError;
      if (currentProfile.onboarded) {
        await queryClient.cancelQueries({ queryKey: ["profile", userId] });
        queryClient.setQueryData(["profile", userId], currentProfile);
        await navigate({ to: "/home", replace: true });
        return;
      }

      const { data: existingGoals, error: readGoalsError } = await supabase
        .from("goals").select("title").eq("user_id", userId).eq("archived", false);
      if (readGoalsError) throw readGoalsError;
      const rows = uniqueGoalTitles(goals, (existingGoals ?? []).map((g) => g.title)).map((title) => ({
        user_id: userId,
        title,
        category: GOAL_PRESETS.find((p) => p.title === title)?.category ?? "other",
        detail: detail.trim() || null,
      }));
      if (rows.length > 0) {
        const { error: goalError } = await supabase.from("goals").insert(rows);
        if (goalError) throw goalError;
      }

      await queryClient.cancelQueries({ queryKey: ["profile", userId] });
      const { data: savedProfile, error: profileError } = await supabase
        .from("profiles")
        .update({
          mom_variant: variant,
          mom_name: momName.trim() || "Mom",
          sass_level: sass,
          timezone,
          onboarded: true,
        })
        .eq("id", userId).select("*").single();
      if (profileError) throw profileError;
      queryClient.setQueryData(["profile", userId], savedProfile);
      await queryClient.invalidateQueries({ queryKey: ["goals", userId] });
      await navigate({ to: "/home", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <p className="font-display text-sm uppercase tracking-widest text-primary">
        Step {step + 1} of 2
      </p>

      {step === 0 ? (
        <section>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Choose your tiger mom</h1>
          <p className="mt-1 text-muted-foreground">
            You get three. Choose carefully — she will remember this.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {MOM_VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariant(v.id)}
                className={cn(
                  "paper-card p-3 text-center transition-transform hover:-translate-y-1",
                  variant === v.id && "ring-2 ring-primary",
                )}
              >
                <img
                  src={v.art.happy}
                  alt={v.name}
                  loading="lazy"
                  width={768}
                  height={1024}
                  className="mx-auto h-44 w-auto"
                />
                <p className="mt-2 font-display text-lg font-bold">{v.name}</p>
                <p className="text-xs text-muted-foreground">{v.tagline}</p>
              </button>
            ))}
          </div>

          <div className="paper-card mt-6 space-y-6 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="momName">What do you call her?</Label>
              <Input
                id="momName"
                value={momName}
                onChange={(e) => setMomName(e.target.value)}
                placeholder="Mom, Mama, Ms. Chen…"
              />
            </div>
            <div>
              <Label>
                Sass level: <span className="text-primary">{SASS_LABELS[sass]}</span>
              </Label>
              <Slider
                className="mt-3"
                min={1}
                max={5}
                step={1}
                value={[sass]}
                onValueChange={(v) => setSass(v[0] ?? 3)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Your time zone</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
              >
                {timezoneOptions(timezone).map((tz) => (
                  <option key={tz} value={tz}>
                    {timezoneLabel(tz)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                So she knows when "today" ends — and when to start worrying.
              </p>
            </div>
          </div>

          <Button size="lg" className="mt-6" onClick={() => setStep(1)}>
            Next: my goal
          </Button>
        </section>
      ) : (
        <section>
          <h1 className="mt-1 font-display text-3xl font-extrabold">
            So. What are you working on?
          </h1>
          <p className="mt-1 text-muted-foreground">Pick up to three. Be honest, she can tell.</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {GOAL_PRESETS.map((p) => (
              <button
                key={p.title}
                type="button"
                onClick={() => togglePreset(p.title)}
                className={cn(
                  "rounded-full border border-border px-4 py-2 text-sm transition-colors",
                  picked.includes(p.title)
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-secondary",
                )}
              >
                {p.title}
              </button>
            ))}
          </div>

          <div className="paper-card mt-6 space-y-5 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="custom">Something else?</Label>
              <Input
                id="custom"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="Finally learning to swim"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="detail">Anything she should know?</Label>
              <Textarea
                id="detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="I have a piano recital in June and I practise after work."
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button size="lg" onClick={finish} disabled={saving}>
              {saving ? "Telling her…" : "Adopt her"}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
