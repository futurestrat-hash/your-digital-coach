import { LoaderCircle, Square, Volume2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { momArt, type MomMood } from "@/lib/mom";
import { streamMomSpeech } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MOOD_LABEL: Record<MomMood, string> = {
  happy: "pleased",
  proud: "proud of you",
  sad: "disappointed",
  upset: "furious",
};

export function MomStage({
  variant,
  mood,
  name,
  message,
  loading,
  showVoiceHint,
  onVoiceStarted,
  className,
}: {
  variant: string;
  mood: string;
  name: string;
  message?: string | null | undefined;
  loading?: boolean;
  showVoiceHint?: boolean;
  onVoiceStarted?: () => void;
  className?: string;
}) {
  const safeMood = (["happy", "proud", "sad", "upset"].includes(mood) ? mood : "happy") as MomMood;
  const [voiceState, setVoiceState] = useState<"idle" | "loading" | "playing">("idle");
  const abortRef = useRef<AbortController | null>(null);

  async function toggleVoice() {
    if (voiceState !== "idle") {
      abortRef.current?.abort();
      setVoiceState("idle");
      return;
    }
    const spoken = message ?? "Well? I'm waiting.";
    const controller = new AbortController();
    abortRef.current = controller;
    setVoiceState("loading");
    onVoiceStarted?.();
    try {
      setVoiceState("playing");
      await streamMomSpeech(spoken, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : "Mom's voice stopped.");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setVoiceState("idle");
      }
    }
  }

  return (
    <div className={cn("mom-stage relative overflow-hidden p-4 sm:p-6", className)}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
        <img
          key={`${variant}-${safeMood}`}
          src={momArt(variant, safeMood)}
          alt={`${name} looking ${MOOD_LABEL[safeMood]}`}
          width={768}
          height={1024}
          className="h-56 w-auto drop-shadow-xl sm:h-72"
        />
        <div className="w-full flex-1 sm:mb-8">
          <div className="speech-bubble p-4">
            <p className="font-display text-sm uppercase tracking-wide text-primary">
              {name} is {MOOD_LABEL[safeMood]}
            </p>
            <p className="mt-1 text-base leading-relaxed text-card-foreground">
              {loading ? "…adjusting her glasses…" : (message ?? "Well? I'm waiting.")}
            </p>
            {!loading && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleVoice}
                  aria-label={voiceState === "idle" ? `Hear ${name} say this` : `Stop ${name}'s voice`}
                  title={voiceState === "idle" ? "Hear Mom" : "Stop voice"}
                >
                  {voiceState === "loading" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : voiceState === "playing" ? (
                    <Square />
                  ) : (
                    <Volume2 />
                  )}
                </Button>
                {showVoiceHint && voiceState === "idle" && (
                  <span className="voice-hint text-xs font-semibold text-primary">Tap to hear her say it</span>
                )}
                {voiceState === "playing" && <span className="text-xs text-muted-foreground">Mom is speaking…</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
