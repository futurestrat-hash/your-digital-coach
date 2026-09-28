import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MomStage } from "@/components/MomStage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { momSpeak } from "@/lib/mom.functions";
import { getVariant } from "@/lib/mom";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Today with Mom — Tiger Mom" },
      {
        name: "description",
        content: "Log what you worked on and let your tiger mom weigh in on your day.",
      },
      { property: "og:title", content: "Today with Mom" },
      { property: "og:description", content: "Log your effort. Receive judgment. Improve." },
    ],
  }),
  component: Home,
});

function Home() {
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const speak = useServerFn(momSpeak);

  const [minutes, setMinutes] = useState("30");
  const [goalId, setGoalId] = useState<string>("");
  const [note, setNote] = useState("");

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

  const logsQuery = useQuery({
    queryKey: ["logs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", new Date(Date.now() - 7 * 864e5).toISOString())
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const messagesQuery = useQuery({
    queryKey: ["messages", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mom_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  const profile = profileQuery.data;

  useEffect(() => {
    if (profileQuery.isSuccess && profile && !profile.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [profileQuery.isSuccess, profile, navigate]);

  const logMutation = useMutation({
    mutationFn: async () => {
      const mins = Math.max(1, Math.min(1440, Number(minutes) || 0));
      const { error } = await supabase.from("activity_logs").insert({
        user_id: userId,
        goal_id: goalId || null,
        minutes: mins,
        note: note.trim() || null,
      });
      if (error) throw error;
      return speak({ data: { kind: "nudge" } });
    },
    onSuccess: () => {
      setNote("");
      toast.success("Logged. She saw it.");
      queryClient.invalidateQueries({ queryKey: ["logs", userId] });
      queryClient.invalidateQueries({ queryKey: ["messages", userId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't log that."),
  });

  const speakMutation = useMutation({
    mutationFn: (kind: "nudge" | "recap" | "ideas") => speak({ data: { kind } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", userId] }),
    onError: () => toast.error("She's speechless (something went wrong). Try again."),
  });

  const logs = logsQuery.data ?? [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayLogs = logs.filter((l) => new Date(l.logged_at) >= startOfToday);
  const todayMinutes = todayLogs.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
  const weekMinutes = logs.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
  const activeDays = new Set(logs.map((l) => new Date(l.logged_at).toDateString())).size;

  const latest = messagesQuery.data?.[0];
  const busy = speakMutation.isPending || logMutation.isPending;
  const momName = profile?.mom_name ?? "Mom";
  const variant = profile?.mom_variant ?? "a";

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-center justify-between">
        <span className="font-display text-xl font-extrabold text-primary">Tiger Mom</span>
        <Button asChild variant="outline" size="sm">
          <Link to="/settings">Settings</Link>
        </Button>
      </header>

      <MomStage
        className="mt-5"
        variant={variant}
        mood={latest?.mood ?? "happy"}
        name={momName}
        message={latest?.body}
        loading={busy}
        animation={profile?.animation_pref}
      />

      {Array.isArray(latest?.ideas) && (latest.ideas as string[]).length > 0 && (
        <ul className="paper-card mt-4 space-y-2 p-4">
          {(latest.ideas as string[]).map((idea) => (
            <li key={idea} className="flex gap-2 text-sm">
              <span className="text-primary">▸</span>
              <span>{idea}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => speakMutation.mutate("nudge")} disabled={busy}>
          Nag me now
        </Button>
        <Button variant="secondary" onClick={() => speakMutation.mutate("ideas")} disabled={busy}>
          Give me ideas
        </Button>
        <Button variant="outline" onClick={() => speakMutation.mutate("recap")} disabled={busy}>
          Recap my day
        </Button>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Today" value={`${todayMinutes} min`} />
        <Stat label="This week" value={`${weekMinutes} min`} />
        <Stat label="Active days (7d)" value={`${activeDays}`} />
      </section>

      <section className="paper-card mt-6 p-5">
        <h2 className="font-display text-xl font-bold">What did you just do?</h2>
        <p className="text-sm text-muted-foreground">
          "I spent 2 hours on piano" — log it and she'll react.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[6rem_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="minutes">Minutes</Label>
            <Input
              id="minutes"
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal">Goal</Label>
            <Select value={goalId} onValueChange={setGoalId}>
              <SelectTrigger id="goal">
                <SelectValue placeholder="Pick a goal" />
              </SelectTrigger>
              <SelectContent>
                {(goalsQuery.data ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Scales, badly"
          />
        </div>
        <Button className="mt-4" onClick={() => logMutation.mutate()} disabled={busy}>
          {logMutation.isPending ? "Reporting to Mom…" : "Log it"}
        </Button>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-bold">Today's log</h2>
        {todayLogs.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing yet. {momName} is watching the door.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {todayLogs.map((l) => (
              <li key={l.id} className="paper-card flex items-center justify-between p-3 text-sm">
                <span>
                  {l.minutes} min
                  {l.note ? ` — ${l.note}` : ""}
                </span>
                <span className="text-muted-foreground">
                  {new Date(l.logged_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">
          Things {getVariant(variant).name.toLowerCase()} has said
        </h2>
        <ul className="mt-3 space-y-2">
          {(messagesQuery.data ?? []).map((m) => (
            <li key={m.id} className="paper-card p-3 text-sm">
              <p>{m.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {m.kind} · {new Date(m.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="paper-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
