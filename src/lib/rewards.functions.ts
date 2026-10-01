import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { localWeekStart } from "@/lib/mom";

function localWeekStartUtc(weekStart: string, timezone: string) {
  const noon = new Date(`${weekStart}T12:00:00Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" })
    .formatToParts(noon)
    .find((part) => part.type === "timeZoneName")?.value.replace("GMT", "") || "+00:00";
  return new Date(`${weekStart}T00:00:00${offset}`).toISOString();
}

export const claimWeeklyReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ goalId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: goal }] = await Promise.all([
      supabase.from("profiles").select("timezone").eq("id", userId).single(),
      supabase.from("goals").select("id, weekly_minutes_target").eq("id", data.goalId).eq("user_id", userId).single(),
    ]);
    if (!profile || !goal) throw new Error("That reward is not available.");
    const weekStart = localWeekStart(new Date(), profile.timezone);
    const { data: logs, error: logsError } = await supabase
      .from("activity_logs")
      .select("minutes")
      .eq("user_id", userId)
      .eq("goal_id", goal.id)
      .gte("logged_at", localWeekStartUtc(weekStart, profile.timezone));
    if (logsError) throw logsError;
    const minutes = (logs ?? []).reduce((sum, log) => sum + log.minutes, 0);
    if (minutes < goal.weekly_minutes_target) throw new Error("Not quite yet. Mom is still slicing.");
    const { error } = await supabase.from("weekly_reward_claims").insert({
      user_id: userId,
      goal_id: goal.id,
      week_start: weekStart,
    });
    if (error?.code === "23505") return { claimed: true, weekStart };
    if (error) throw error;
    return { claimed: true, weekStart };
  });