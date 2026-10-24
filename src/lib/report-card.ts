import type { MomMood } from "@/lib/mom";

export type ReportGrade = "A+" | "A" | "B" | "C" | "D" | "F";

export type ReportCard = {
  grade: ReportGrade;
  verdict: string;
  mood: MomMood;
  percent: number;
};

const GRADE_TABLE: { min: number; grade: ReportGrade; verdict: string; mood: MomMood }[] = [
  { min: 100, grade: "A+", verdict: "Mom is telling the aunties. All of them.", mood: "proud" },
  { min: 80, grade: "A", verdict: "Acceptable. Mom almost smiled.", mood: "proud" },
  { min: 60, grade: "B", verdict: "Mom is watching. Closely.", mood: "happy" },
  { min: 40, grade: "C", verdict: "Mom has questions.", mood: "sad" },
  { min: 20, grade: "D", verdict: "Mom is disappointed, but not surprised.", mood: "upset" },
  { min: 0, grade: "F", verdict: "Mom is very quiet. Worryingly quiet.", mood: "upset" },
];

export function computeReportCard(weekMinutes: number, targetMinutes: number): ReportCard {
  const safeTarget = Math.max(0, targetMinutes);
  const percent = safeTarget === 0 ? 0 : Math.round((Math.max(0, weekMinutes) / safeTarget) * 100);
  const row = GRADE_TABLE.find((r) => percent >= r.min) ?? GRADE_TABLE[GRADE_TABLE.length - 1]!;
  return { grade: row.grade, verdict: row.verdict, mood: row.mood, percent };
}
