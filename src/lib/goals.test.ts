import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { hasDuplicateGoal, uniqueGoalTitles } from "./goals";

describe("goal duplicates", () => {
  test("preset and custom versions of the same goal are saved once", () => {
    assert.deepEqual(uniqueGoalTitles(["Learning an instrument", " learning an instrument "]), ["Learning an instrument"]);
  });
  test("repeating onboarding does not reinsert an existing goal", () => {
    assert.deepEqual(uniqueGoalTitles(["Learning an instrument", "Writing every day"], ["Learning an instrument"]), ["Writing every day"]);
  });
  test("adding a duplicate ignores case and extra spaces", () => {
    assert.equal(hasDuplicateGoal(" learning  JAPANESE ", [{ id: "1", title: "Learning Japanese" }]), true);
    assert.equal(hasDuplicateGoal("Learning piano", [{ id: "1", title: "Learning Japanese" }]), false);
  });
  test("editing keeps the same goal ID and permits its own title, but not another goal's", () => {
    const goals = [{ id: "1", title: "Learning Japanese" }, { id: "2", title: "Learning piano" }];
    assert.equal(hasDuplicateGoal("Learning Japanese", goals, "1"), false);
    assert.equal(hasDuplicateGoal("Learning piano", goals, "1"), true);
  });
});