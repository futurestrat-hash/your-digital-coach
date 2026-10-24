import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { localWeekStart } from "@/lib/mom";
import { computeReportCard } from "@/lib/report-card";

// Public, unauthenticated by design: this powers the shareable report-card page.
// It returns only share-safe fields (first name, mom style, weekly totals, grade).
export const getReportCard = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, mom_name, mom_variant, timezone, onboarded")
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile || !profile.onboarded) throw new Error("Report card not found.");

    const tz = profile.timezone ?? "UTC";
    const weekStart = localWeekStart(new Date(), tz);
    const weekStartUtc = new Date(`${weekStart}T00:00:00Z`).toISOString();

    const [{ data: goals }, { data: logs }] = await Promise.all([
      supabaseAdmin
        .from("goals")
        .select("weekly_minutes_target")
        .eq("user_id", data.userId)
        .eq("archived", false),
      supabaseAdmin
        .from("activity_logs")
        .select("minutes, logged_at")
        .eq("user_id", data.userId)
        .gte("logged_at", weekStartUtc),
    ]);

    const logList = logs ?? [];
    const weekMinutes = logList.reduce((sum, log) => sum + (log.minutes ?? 0), 0);
    const targetMinutes = (goals ?? []).reduce((sum, goal) => sum + goal.weekly_minutes_target, 0);
    const activeDays = new Set(logList.map((log) => localWeekStart(new Date(log.logged_at), tz) && log.logged_at.slice(0, 10))).size;

    const card = computeReportCard(weekMinutes, targetMinutes);
    const firstName = (profile.display_name ?? "This student").trim().split(/\s+/)[0] || "This student";

    return {
      firstName,
      momName: profile.mom_name,
      momVariant: profile.mom_variant,
      weekStart,
      weekMinutes,
      targetMinutes,
      activeDays,
      ...card,
    };
  });
