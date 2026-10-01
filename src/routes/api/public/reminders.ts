import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { p256 } from "@noble/curves/nist.js";
import { createFileRoute } from "@tanstack/react-router";

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function decodePrivateKey(value: string) {
  return Uint8Array.from(Buffer.from(value, "base64url"));
}

function localParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${read("year")}-${read("month")}-${read("day")}`, time: `${read("hour")}:${read("minute")}` };
}

export const Route = createFileRoute("/api/public/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env["LOVABLE_CRON_SECRET"];
        const authorization = request.headers.get("authorization");
        if (!cronSecret || authorization !== `Bearer ${cronSecret}`) return new Response("Unauthorized", { status: 401 });
        const privateKey = process.env["VAPID_PRIVATE_KEY"];
        const subject = process.env["VAPID_SUBJECT"];
        if (!privateKey || !subject) return new Response("Reminders are not configured.", { status: 503 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();
        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("id, mom_name, timezone, reminder_time, push_subscriptions(*)")
          .eq("reminder_enabled", true);
        if (error) return new Response(error.message, { status: 500 });
        const publicKey = base64Url(p256.getPublicKey(decodePrivateKey(privateKey), false));
        let delivered = 0;

        for (const profile of profiles ?? []) {
          const local = localParts(now, profile.timezone);
          if (local.time < profile.reminder_time || local.time >= `${profile.reminder_time.slice(0, 3)}${String(Number(profile.reminder_time.slice(3)) + 10).padStart(2, "0")}`) continue;
          const { data: exists } = await supabaseAdmin
            .from("reminder_deliveries")
            .select("id")
            .eq("user_id", profile.id)
            .eq("local_date", local.date)
            .maybeSingle();
          if (exists) continue;
          const localStart = new Date(`${local.date}T00:00:00Z`);
          const { count } = await supabaseAdmin
            .from("activity_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", profile.id)
            .gte("logged_at", new Date(localStart.getTime() - 14 * 3600e3).toISOString());
          if ((count ?? 0) > 0) continue;
          let sent = false;
          for (const row of profile.push_subscriptions ?? []) {
            const subscription: PushSubscription = {
              endpoint: row.endpoint,
              expirationTime: null,
              keys: { p256dh: row.p256dh, auth: row.auth },
            };
            const payload = await buildPushPayload(
              {
                data: JSON.stringify({
                  title: `${profile.mom_name} is checking in`,
                  body: "Nothing logged today. Your cousin has apparently discovered calendars.",
                  tag: `tiger-mom-${local.date}`,
                }),
                options: { ttl: 600 },
              },
              subscription,
              { subject, publicKey, privateKey },
            );
            const response = await fetch(subscription.endpoint, payload);
            sent ||= response.ok;
            if (response.status === 404 || response.status === 410) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("id", row.id);
            }
          }
          if (sent) {
            await supabaseAdmin.from("reminder_deliveries").insert({ user_id: profile.id, local_date: local.date });
            delivered += 1;
          }
        }
        return Response.json({ delivered });
      },
    },
  },
});