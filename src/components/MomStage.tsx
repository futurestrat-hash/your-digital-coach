import { momArt, type MomMood } from "@/lib/mom";
import { cn } from "@/lib/utils";

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
  className,
}: {
  variant: string;
  mood: string;
  name: string;
  message?: string | null | undefined;
  loading?: boolean;
  className?: string;
}) {
  const safeMood = (["happy", "proud", "sad", "upset"].includes(mood) ? mood : "happy") as MomMood;

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
          </div>
        </div>
      </div>
    </div>
  );
}
