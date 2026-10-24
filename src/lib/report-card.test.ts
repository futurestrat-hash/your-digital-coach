import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { computeReportCard } from "./report-card";

describe("weekly report card grades", () => {
  test("meeting the full weekly target earns an A+", () => {
    assert.equal(computeReportCard(300, 300).grade, "A+");
    assert.equal(computeReportCard(450, 300).grade, "A+");
  });
  test("80% of target earns an A, 60% a B, 40% a C, 20% a D", () => {
    assert.equal(computeReportCard(240, 300).grade, "A");
    assert.equal(computeReportCard(180, 300).grade, "B");
    assert.equal(computeReportCard(120, 300).grade, "C");
    assert.equal(computeReportCard(60, 300).grade, "D");
  });
  test("under 20% of target earns an F", () => {
    assert.equal(computeReportCard(59, 300).grade, "F");
    assert.equal(computeReportCard(0, 300).grade, "F");
  });
  test("no goal target means an F, not a crash or a free pass", () => {
    const card = computeReportCard(120, 0);
    assert.equal(card.grade, "F");
    assert.equal(card.percent, 0);
  });
  test("high grades make Mom proud, low grades make her upset", () => {
    assert.equal(computeReportCard(300, 300).mood, "proud");
    assert.equal(computeReportCard(0, 300).mood, "upset");
  });
});
