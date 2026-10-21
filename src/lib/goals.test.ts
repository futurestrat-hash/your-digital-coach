import { describe, expect, test } from "bun:test";
import { hasDuplicateGoal, uniqueGoalTitles } from "./goals";

describe("goal duplicates", () => {
  test("preset and custom versions of the same goal are saved once", () => {
    expect(uniqueGoalTitles(["Learning an instrument", " learning an instrument "])).toEqual(["Learning an instrument"]);
  });
  test("repeating onboarding does not reinsert an existing goal", () => {
    expect(uniqueGoalTitles(["Learning an instrument", "Writing every day"], ["Learning an instrument"])).toEqual(["Writing every day"]);
  });
  test("adding a duplicate ignores case and extra spaces", () => {
    expect(hasDuplicateGoal(" learning  JAPANESE ", [{ id: "1", title: "Learning Japanese" }])).toBe(true);
    expect(hasDuplicateGoal("Learning piano", [{ id: "1", title: "Learning Japanese" }])).toBe(false);
  });
  test("editing keeps the same goal ID and permits its own title, but not another goal's", () => {
    const goals = [{ id: "1", title: "Learning Japanese" }, { id: "2", title: "Learning piano" }];
    expect(hasDuplicateGoal("Learning Japanese", goals, "1")).toBe(false);
    expect(hasDuplicateGoal("Learning piano", goals, "1")).toBe(true);
  });
});