import { Copy, Download } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { momArt } from "@/lib/mom";
import { computeReportCard } from "@/lib/report-card";

const SITE_URL = "https://tiger-mom.lovable.app";

export function ReportCard({
  variant,
  momName,
  firstName,
  weekMinutes,
  targetMinutes,
  activeDays,
  weekStart,
}: {
  variant: string;
  momName: string;
  firstName: string;
  weekMinutes: number;
  targetMinutes: number;
  activeDays: number;
  weekStart: string;
}) {
  const card = computeReportCard(weekMinutes, targetMinutes);
  const art = momArt(variant, card.mood);
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const shareText = `My Tiger Mom report card: ${card.grade} — "${card.verdict}" ${weekMinutes} min logged this week toward ${targetMinutes} min. ${SITE_URL}`;

  async function cardPng(): Promise<Blob> {
    if (!cardRef.current) throw new Error("missing card");
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(cardRef.current, { pixelRatio: 2 });
    if (!blob) throw new Error("render failed");
    return blob;
  }

  async function copyText() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": await cardPng() })]);
      toast.success("Copied the image. Mom expects you to show everyone.");
    } catch {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.info("Your browser blocked image copying, so the text version was copied instead.");
      } catch {
        toast.error("Couldn't copy that. Try 'Save as image' instead.");
      }
    }
  }

  async function saveImage() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `tiger-mom-report-card-${weekStart}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Saved. Frame it. Or hide it. Mom will know either way.");
    } catch {
      toast.error("Couldn't save the image. Try a screenshot instead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6">
      <h2 className="font-display text-xl font-bold">This week's report card</h2>
      <div ref={cardRef} className="paper-card mt-3 flex items-center gap-4 p-5">
        <img src={art} alt={`${momName} looking ${card.mood}`} width={768} height={1024} className="h-28 w-auto drop-shadow-lg" />
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {firstName} · week of {weekStart}
          </p>
          <p className="font-display text-5xl font-extrabold text-primary">{card.grade}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">"{card.verdict}"</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {weekMinutes} of {targetMinutes} min · {activeDays} active day{activeDays === 1 ? "" : "s"} · {SITE_URL}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copyText}>
          <Copy /> Copy report card
        </Button>
        <Button variant="outline" size="sm" onClick={saveImage} disabled={saving}>
          <Download /> {saving ? "Saving…" : "Save as image"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Private to you — nothing is posted anywhere. Copy the text or save the image and share it yourself.
      </p>
    </section>
  );
}
