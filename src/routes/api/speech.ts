import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

const SpeechInput = z.object({ text: z.string().trim().min(1).max(600) });

export const Route = createFileRoute("/api/speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        const url = process.env["SUPABASE_URL"];
        const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!apiKey || !url || !publishableKey) return new Response("Voice is not configured.", { status: 503 });

        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) return new Response("Please sign in again.", { status: 401 });
        const token = authorization.slice(7);
        const auth = createClient<Database>(url, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}`, apikey: publishableKey } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: authError } = await auth.auth.getClaims(token);
        if (authError || !claims?.claims?.sub) return new Response("Please sign in again.", { status: 401 });

        const parsed = SpeechInput.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("That message cannot be read aloud.", { status: 400 });
        const spokenText = `Speak as a warm, mature, firm Asian mother. Use a subtle, natural accent without caricature or exaggerated pronunciation. Keep the delivery affectionate, dry, and composed. Say: ${parsed.data.text}`;
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-tts-preview",
            contents: [{ role: "user", parts: [{ text: spokenText }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
            },
            stream_format: "sse",
          }),
          signal: request.signal,
        });
        const headers = new Headers({
          "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream",
          "Cache-Control": "no-cache",
        });
        const runId = upstream.headers.get("X-Lovable-AIG-Run-ID");
        if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});