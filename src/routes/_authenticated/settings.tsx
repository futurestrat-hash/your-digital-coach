import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import {
  MOM_VARIANTS,
  SASS_LABELS,
  detectTimezone,
  timezoneLabel,
  timezoneOptions,
  type MomVariantId,
} from "@/lib/mom";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Tiger Mom" },
      { name: "description", content: "Swap your tiger mom, tune her sass, and manage your goals." },
      { property: "og:title", content: "Settings — Tiger Mom" },
      { property: "og:description", content: "Change her look, her name, her attitude." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [variant, setVariant] = useState<MomVariantId>("a");
  const [momName, setMomName] = useState("Mom");
  const [sass, setSass] = useState(3);
  const [timezone, setTimezone] = useState(detectTimezone);
  const [newGoal, setNewGoal] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const goalsQuery = useQuery({
    queryKey: ["goals", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const p = profileQuery.data;
    if (p) {
      setVariant((p.mom_variant as MomVariantId) ?? "a");
      setMomName(p.mom_name ?? "Mom");
      setSass(p.sass_level ?? 3);
      setTimezone(p.timezone ?? detectTimezone());
    }
  }, [profileQuery.data]);

  async function saveProfile() {
    const { error } = await supabase
      .from("profiles")
      .update({ mom_variant: variant, mom_name: momName.trim() || "Mom", sass_level: sass, timezone })
      .eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    toast.success("She has been updated.");
  }

  async function addGoal() {
    if (!newGoal.trim()) return;
    const { error } = await supabase
      .from("goals")
      .insert({ user_id: userId, title: newGoal.trim(), category: "other" });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewGoal("");
    queryClient.invalidateQueries({ queryKey: ["goals", userId] });
  }

  async function archiveGoal(id: string) {
    const { error } = await supabase.from("goals").update({ archived: true }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["goals", userId] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-center justify-between">
        <span className="font-display text-xl font-extrabold text-primary">Tiger Mom</span>
        <Button asChild variant="outline" size="sm">
          <Link to="/home">Back</Link>
        </Button>
      </header>

      <h1 className="mt-6 font-display text-3xl font-extrabold">Your mom, adjusted</h1>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
              src={v.art.proud}
              alt={v.name}
              loading="lazy"
              width={768}
              height={1024}
              className="mx-auto h-40 w-auto"
            />
            <p className="mt-2 font-display font-bold">{v.name}</p>
          </button>
        ))}
      </div>

      <div className="paper-card mt-5 space-y-6 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="momName">Her name</Label>
          <Input id="momName" value={momName} onChange={(e) => setMomName(e.target.value)} />
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
        </div>
        <Button onClick={saveProfile}>Save</Button>
      </div>

      <section className="paper-card mt-6 p-5">
        <h2 className="font-display text-xl font-bold">Goals</h2>
        <ul className="mt-3 space-y-2">
          {(goalsQuery.data ?? []).map((g) => (
            <li key={g.id} className="flex items-center justify-between text-sm">
              <span>{g.title}</span>
              <Button variant="ghost" size="sm" onClick={() => archiveGoal(g.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <Input
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Add a goal"
          />
          <Button onClick={addGoal}>Add</Button>
        </div>
      </section>

      <Button variant="outline" className="mt-6" onClick={signOut}>
        Sign out
      </Button>
    </main>
  );
}
