import { createParser } from "eventsource-parser";

export function decodePCM(pending: Uint8Array, incoming: Uint8Array) {
  const bytes = new Uint8Array(pending.length + incoming.length);
  bytes.set(pending);
  bytes.set(incoming, pending.length);
  const usable = bytes.length - (bytes.length % 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(usable / 2);
  for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768;
  return { samples, pending: bytes.slice(usable) };
}

export async function streamMomSpeech(text: string, signal?: AbortSignal) {
  const { data } = await import("@/integrations/supabase/client").then(({ supabase }) =>
    supabase.auth.getSession(),
  );
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again to hear Mom.");

  const context = new AudioContext({ sampleRate: 24000 });
  const sources = new Set<AudioBufferSourceNode>();
  const controller = new AbortController();
  const stop = () => {
    controller.abort(signal?.reason);
    for (const source of sources) source.stop();
  };
  signal?.addEventListener("abort", stop, { once: true });
  let playhead = 0;
  let pending = new Uint8Array(0);
  let completed = false;
  let samplesPlayed = 0;
  let playback: Promise<void> = Promise.resolve();

  try {
    if (context.state === "suspended") await context.resume();
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      const message = await response.text();
      throw new Error(message || `Mom's voice failed (${response.status}).`);
    }
    const parser = createParser({
      onEvent(event) {
        const payload = JSON.parse(event.data) as { type?: string; audio?: string; error?: { message?: string } };
        if (payload.type === "error" || payload.error) {
          throw new Error(payload.error?.message ?? "Mom's voice was interrupted.");
        }
        if (payload.type === "speech.audio.done") {
          completed = true;
          return;
        }
        if (payload.type !== "speech.audio.delta" || !payload.audio) return;
        const decoded = decodePCM(pending, Uint8Array.from(atob(payload.audio), (char) => char.charCodeAt(0)));
        pending = decoded.pending;
        if (!decoded.samples.length) return;
        samplesPlayed += decoded.samples.length;
        const buffer = context.createBuffer(1, decoded.samples.length, 24000);
        buffer.copyToChannel(decoded.samples, 0);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        sources.add(source);
        playback = new Promise<void>((resolve) => {
          source.onended = () => {
            sources.delete(source);
            resolve();
          };
        });
        playhead = Math.max(playhead, context.currentTime + 0.05);
        source.start(playhead);
        playhead += buffer.duration;
      },
    });
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        parser.feed(next.value);
      }
      parser.reset({ consume: true });
    } finally {
      reader.releaseLock();
    }
    if (!completed || !samplesPlayed || pending.length) throw new Error("Mom's voice stream was incomplete.");
    await playback;
  } finally {
    signal?.removeEventListener("abort", stop);
    controller.abort();
    for (const source of sources) source.stop();
    await context.close();
  }
}