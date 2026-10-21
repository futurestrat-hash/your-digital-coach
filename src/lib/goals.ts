/** Compare user-entered goal titles without case or whitespace differences. */
export function goalTitleKey(title: string) {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function uniqueGoalTitles(titles: string[], existingTitles: string[] = []) {
  const seen = new Set(existingTitles.map(goalTitleKey));
  return titles.reduce<string[]>((result, title) => {
    const trimmed = title.trim();
    const key = goalTitleKey(trimmed);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
    return result;
  }, []);
}

export function hasDuplicateGoal(
  title: string,
  goals: { id: string; title: string }[],
  editingId?: string,
) {
  return goals.some((goal) => goal.id !== editingId && goalTitleKey(goal.title) === goalTitleKey(title));
}