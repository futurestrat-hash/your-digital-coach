import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hasDuplicateGoal } from "@/lib/goals";
import { supabase } from "@/integrations/supabase/client";
import { getReminderPublicKey } from "@/lib/reminders.functions";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getPublicKey = useServerFn(getReminderPublicKey);

  const [variant, setVariant] = useState<MomVariantId>("a");
  const [momName, setMomName] = useState("Mom");
  const [sass, setSass] = useState(3);
  const [timezone, setTimezone] = useState(detectTimezone);
  const [newGoal, setNewGoal] = useState("");
  const [editingGoal, setEditingGoal] = useState<{ id: string; title: string } | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [goalBusy, setGoalBusy] = useState(false);
  const goalSaving = useRef(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");

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
      setReminderEnabled(p.reminder_enabled ?? false);
      setReminderTime(p.reminder_time ?? "20:00");
    }
  }, [profileQuery.data]);

  async function saveProfile() {
    const { error } = await supabase
      .from("profiles")
      .update({
        mom_variant: variant,
        mom_name: momName.trim() || "Mom",
        sass_level: sass,
        timezone,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderTime,
      })
      .eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    toast.success("She has been updated.");
  }

  async function toggleReminder(enabled: boolean) {
    if (enabled) {
      if (!("Notification" in window)) {
        toast.error("This browser does not support notifications.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications are blocked in your browser settings.");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("Background reminders are not supported in this browser.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/tiger-mom-sw.js");
      const { publicKey } = await getPublicKey();
      const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(publicKey.length / 4) * 4, "=")), (character) => character.charCodeAt(0));
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.["p256dh"] || !json.keys["auth"]) throw new Error("Browser reminder setup was incomplete.");
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys["p256dh"],
        auth: json.keys["auth"],
      }, { onConflict: "user_id,endpoint" });
      if (error) throw error;
    }
    setReminderEnabled(enabled);
  }

  async function addGoal() {
    await saveGoal(newGoal);
  }

  async function saveGoal(title: string, id?: string) {
    if (!title.trim() || goalSaving.current) return;
    goalSaving.current = true;
    setGoalBusy(true);
    try {
      const { data: goals, error: readError } = await supabase.from("goals")
        .select("id,title").eq("user_id", userId).eq("archived", false);
      if (readError) throw readError;
      if (hasDuplicateGoal(title, goals ?? [], id)) {
        toast.error("You already have that goal. Edit the existing one instead.");
        return;
      }
      const result = id
        ? await supabase.from("goals").update({ title: title.trim() }).eq("id", id).eq("user_id", userId)
        : await supabase.from("goals").insert({ user_id: userId, title: title.trim(), category: "other" });
      if (result.error) throw result.error;
      if (id) setEditingGoal(null);
      else setNewGoal("");
      await queryClient.invalidateQueries({ queryKey: ["goals", userId] });
      toast.success(id ? "Goal updated." : "Goal added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that goal.");
    } finally {
      goalSaving.current = false;
      setGoalBusy(false);
    }
  }

  async function archiveGoal(id: string) {
    if (goalSaving.current) return;
    goalSaving.current = true;
    setGoalBusy(true);
    const { error } = await supabase.from("goals").update({ archived: true }).eq("id", id).eq("user_id", userId);
    goalSaving.current = false;
    setGoalBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["goals", userId] });
    toast.success("Goal removed. Your past logs are kept.");
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
        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="daily-reminder">Daily reminder</Label>
              <p className="text-xs text-muted-foreground">Only when you have not logged anything that day.</p>
            </div>
            <Switch id="daily-reminder" checked={reminderEnabled} onCheckedChange={toggleReminder} />
          </div>
          {reminderEnabled && (
            <div className="mt-4 max-w-44 space-y-1.5">
              <Label htmlFor="reminder-time">Remind me at</Label>
              <Input id="reminder-time" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
            </div>
          )}
        </div>
        <Button onClick={saveProfile}>Save</Button>
      </div>

      <section className="paper-card mt-6 p-5">
        <h2 className="font-display text-xl font-bold">Goals</h2>
        <ul className="mt-3 space-y-2">
          {(goalsQuery.data ?? []).map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">{g.title}</span>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" disabled={goalBusy} aria-label={`Edit ${g.title}`} title="Edit goal" onClick={() => { setEditingGoal(g); setEditedTitle(g.title); }}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="sm" disabled={goalBusy} aria-label={`Remove ${g.title}`} onClick={() => archiveGoal(g.id)}>
                  <X /> Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void addGoal(); }}>
          <Input
            aria-label="Add a goal"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Add a goal"
          />
          <Button type="submit" disabled={goalBusy || !newGoal.trim() || !goalsQuery.isSuccess}>Add</Button>
        </form>
      </section>

      <Dialog open={editingGoal !== null} onOpenChange={(open) => { if (!open && !goalBusy) setEditingGoal(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit goal</DialogTitle>
            <DialogDescription>Your logged progress stays with this goal.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (editingGoal) void saveGoal(editedTitle, editingGoal.id); }}>
            <div className="space-y-1.5">
              <Label htmlFor="edit-goal-title">Goal name</Label>
              <Input id="edit-goal-title" value={editedTitle} onChange={(event) => setEditedTitle(event.target.value)} disabled={goalBusy} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={goalBusy} onClick={() => setEditingGoal(null)}>Cancel</Button>
              <Button type="submit" disabled={goalBusy || !editedTitle.trim()}>{goalBusy ? "Saving…" : "Save goal"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Button variant="outline" className="mt-6" onClick={signOut}>
        Sign out
      </Button>
    </main>
  );
}
