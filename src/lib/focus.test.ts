import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { FOCUS_PRESETS, awayVerdict, clampFocusMinutes, focusNote, formatClock } from "./focus";

describe("focus session rules", () => {
  test("presets are 15, 25 and 45 minutes with no pomodoro branding", () => {
    assert.deepEqual(
      FOCUS_PRESETS.map((preset) => preset.minutes),
      [15, 25, 45],
    );
    assert.ok(!FOCUS_PRESETS.some((preset) => /pomodoro/i.test(preset.label)));
  });
  test("custom minutes are clamped to 5-180 and rounded", () => {
    assert.equal(clampFocusMinutes(2), 5);
    assert.equal(clampFocusMinutes(900), 180);
    assert.equal(clampFocusMinutes(24.6), 25);
    assert.equal(clampFocusMinutes(Number.NaN), 5);
  });
  test("the clock reads mm:ss and never goes negative", () => {
    assert.equal(formatClock(0), "0:00");
    assert.equal(formatClock(65), "1:05");
    assert.equal(formatClock(2700), "45:00");
    assert.equal(formatClock(-10), "0:00");
  });
  test("15 seconds off-tab is fine, 90 is a wander, more is leaving", () => {
    assert.equal(awayVerdict(15), "stayed");
    assert.equal(awayVerdict(16), "peeked");
    assert.equal(awayVerdict(90), "peeked");
    assert.equal(awayVerdict(91), "left");
  });
  test("the logged note says what she saw", () => {
    assert.equal(focusNote("The sit-down", "stayed"), "Focus session · The sit-down");
    assert.equal(focusNote("Warm-up", "left"), "Focus session · Warm-up · left the page");
  });
});
