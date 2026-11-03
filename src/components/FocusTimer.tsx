import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Timer } from "lucide-react";
import { toast } from "sonner";

import { MomStage } from "@/components/MomStage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { momArt } from "@/lib/mom";
import { momSpeak } from "@/lib/mom.functions";
import {
  FOCUS_PRESETS,
  FOCUS_VERDICT_MOOD,
  awayVerdict,
  clampFocusMinutes,
  focusNote,
  formatClock,
} from "@/lib/focus";

type Goal = { id: string; title: string };
type Phase = "setup" | "running" | "done";
type Reason = "complete" | "early" | "left";

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

export function FocusTimer({
  userId,
  variant,
  momName,
  goals,
  showVoiceHint,
  onVoiceStarted,
  onLogged,
}: {
  userId: string;
  variant: string;
  momName: string;
  goals: Goal[];
  showVoiceHint: boolean;
  onVoiceStarted?: () => void;
  onLogged: () => void;
}) {
  const speak = useServerFn(momSpeak);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("setup");
  const [goalId, setGoalId] = useState("");
  const [presetMinutes, setPresetMinutes] = useState(25);
  const [customMinutes, setCustomMinutes] = useState("");
  const [endsAt, setEndsAt] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [awaySeconds, setAwaySeconds] = useState(0);
  const [label, setLabel] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const [reply, setReply] = useState<{ body: string; mood: string } | null>(null);
  const [loggedMinutes, setLoggedMinutes] = useState(0);

  const runningRef = useRef(false);
  const loggingRef = useRef(false);
  const awayRef = useRef(0);
  const finishRef = useRef<(reason: Reason) => void>(() => {});

  const usingCustom = customMinutes.trim().length > 0;
  const minutes = usingCustom ? clampFocusMinutes(Number(customMinutes)) : presetMinutes;
  const goalTitle = goals.find((goal) => goal.id === goalId)?.title;

  function bumpAway(seconds: number) {
    awayRef.current += Math.max(0, Math.round(seconds));
    setAwaySeconds(awayRef.current);
  }

  const finish = useCallback(
    async (reason: Reason) => {
      if (!runningRef.current || loggingRef.current) return;
      loggingRef.current = true;
      runningRef.current = false;

      const elapsedMs = Math.max(0, totalMs - Math.max(0, endsAt - Date.now()));
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const verdict = awayVerdict(awayRef.current);

      if (reason !== "complete" && elapsedMinutes < 1) {
        setPhase("setup");
        setOpen(false);
        toast("Mom saw that.");
        return;
      }

      const logged = Math.max(1, reason === "complete" ? minutes : elapsedMinutes);
      const { error } = await supabase.from("activity_logs").insert({
        user_id: userId,
        goal_id: goalId || null,
        minutes: logged,
        note: focusNote(label, verdict),
      });
      if (error) {
        loggingRef.current = false;
        toast.error("Couldn't log the session.");
        setPhase("setup");
        setOpen(false);
        return;
      }

      onLogged();
      setLoggedMinutes(logged);
      if (reason !== "complete") toast(`${momName} logged what you actually did.`);

      try {
        const result = await speak({
          data: {
            kind: "focus_done",
            focusMinutes: logged,
            focusGoalTitle: goalTitle,
            focusAwaySeconds: awayRef.current,
          },
        });
        setReply({ body: result.body, mood: result.mood });
      } catch {
        setReply({ body: "Sit down again tomorrow. That is the whole plan.", mood: verdict === "stayed" ? "proud" : "sad" });
      }
      setPhase("done");
    },
    [endsAt, goalId, goalTitle, label, minutes, momName, onLogged, speak, totalMs, userId],
  );

  finishRef.current = finish;

  function start() {
    loggingRef.current = false;
    awayRef.current = 0;
    setAwaySeconds(0);
    setReply(null);
    setOpening(null);
    setLoggedMinutes(0);
    setLabel(usingCustom ? `${minutes} min` : (FOCUS_PRESETS.find((preset) => preset.minutes === minutes)?.label ?? `${minutes} min`));
    const total = minutes * 60_000;
    setTotalMs(total);
    setRemainingMs(total);
    setEndsAt(Date.now() + total);
    runningRef.current = true;
    setPhase("running");

    void (async () => {
      try {
        const result = await speak({ data: { kind: "focus_start", focusMinutes: minutes, focusGoalTitle: goalTitle } });
        setOpening(result.body);
      } catch {
        setOpening("Phone away. Water. You stay in the chair.");
      }
    })();
  }

  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => {
      const left = Math.max(0, endsAt - Date.now());
      setRemainingMs(left);
      if (left <= 0) finishRef.current("complete");
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, endsAt]);

  useEffect(() => {
    if (phase !== "running") return;
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt !== null) {
        bumpAway((Date.now() - hiddenAt) / 1000);
        hiddenAt = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (hiddenAt !== null) bumpAway((Date.now() - hiddenAt) / 1000);
    };
  }, [phase]);

  useEffect(
    () => () => {
      finishRef.current("left");
    },
    [],
  );

  const verdict = awayVerdict(awaySeconds);
  const mood = phase === "done" ? (reply?.mood ?? "proud") : FOCUS_VERDICT_MOOD[verdict];
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (phase === "running") return;
        setOpen(next);
        if (!next) setPhase("setup");
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Timer /> Study with Mom
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{phase === "running" ? "She is watching" : "Study with Mom"}</DialogTitle>
          <DialogDescription>
            {phase === "done"
              ? "Session over. She already knows how it went."
              : "Pick a goal, pick a length, and sit down. She keeps the time."}
          </DialogDescription>
        </DialogHeader>

        {phase === "setup" && (
          <div className="space-y-4">
            {goals.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="focus-goal">Goal</Label>
                <Select value={goalId} onValueChange={setGoalId}>
                  <SelectTrigger id="focus-goal">
                    <SelectValue placeholder="Pick a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {goals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>How long</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {FOCUS_PRESETS.map((preset) => (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => {
                      setPresetMinutes(preset.minutes);
                      setCustomMinutes("");
                    }}
                    className={`rounded-xl border-2 p-3 text-left transition-colors ${
                      !usingCustom && presetMinutes === preset.minutes
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="font-display text-lg font-bold text-foreground">{preset.minutes} min</span>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
                      {preset.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{preset.blurb}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="focus-custom">Or your own length (min)</Label>
              <Input
                id="focus-custom"
                type="number"
                min={5}
                max={180}
                value={customMinutes}
                onChange={(event) => setCustomMinutes(event.target.value)}
                placeholder={String(presetMinutes)}
              />
            </div>

            <Button className="w-full" onClick={start}>
              Sit down · {minutes} min
            </Button>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-5">
              <img
                src={momArt(variant, mood)}
                alt={`${momName} watching you work`}
                width={768}
                height={1024}
                className="h-36 w-auto drop-shadow-lg sm:h-44"
              />
              <div className="relative grid h-40 w-40 place-items-center">
                <svg viewBox="0 0 120 120" className="h-40 w-40 -rotate-90">
                  <circle cx="60" cy="60" r={RING_R} fill="none" strokeWidth="9" className="stroke-border" />
                  <circle
                    cx="60"
                    cy="60"
                    r={RING_R}
                    fill="none"
                    strokeWidth="9"
                    strokeLinecap="round"
                    className="stroke-primary"
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C * (1 - progress)}
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="font-display text-3xl font-extrabold tabular-nums text-foreground">
                    {formatClock(remainingMs / 1000)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                </div>
              </div>
            </div>

            <p
              className={`text-center text-sm font-semibold ${
                verdict === "stayed" ? "text-jade" : "text-primary"
              }`}
            >
              {verdict === "stayed"
                ? "She is watching. Do not disappoint her."
                : verdict === "peeked"
                  ? "She noticed you leave the page."
                  : "She counted every second you were gone."}
            </p>

            <div className="speech-bubble p-3">
              <p className="text-sm leading-relaxed text-card-foreground">
                {opening ?? "…setting the terms…"}
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={() => finishRef.current("early")}>
              I am done early
            </Button>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4">
            <MomStage
              variant={variant}
              mood={mood}
              name={momName}
              message={reply?.body}
              showVoiceHint={showVoiceHint}
              onVoiceStarted={onVoiceStarted}
            />
            <p className="text-center text-sm text-muted-foreground">
              Logged {loggedMinutes} min{goalTitle ? ` for ${goalTitle}` : ""}
              {awaySeconds > 15 ? ` · away ${formatClock(awaySeconds)}` : ""}
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setPhase("setup");
                setOpen(false);
              }}
            >
              Done here
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
