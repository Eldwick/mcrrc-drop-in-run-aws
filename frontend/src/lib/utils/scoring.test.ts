import { describe, it, expect } from "vitest";
import {
  PACE_SCORES,
  PACE_WEIGHT,
  PROXIMITY_WEIGHT,
  proximityScore,
  relevanceScore,
} from "./scoring";

describe("PACE_SCORES", () => {
  it("maps consistently to 1.0", () => {
    expect(PACE_SCORES.consistently).toBe(1.0);
  });

  it("maps frequently to 0.7", () => {
    expect(PACE_SCORES.frequently).toBe(0.7);
  });

  it("maps sometimes to 0.4", () => {
    expect(PACE_SCORES.sometimes).toBe(0.4);
  });

  it("maps rarely to 0.1", () => {
    expect(PACE_SCORES.rarely).toBe(0.1);
  });
});

describe("proximityScore", () => {
  it("returns 1.0 at 0 miles", () => {
    expect(proximityScore(0)).toBe(1.0);
  });

  it("returns 0.5 at 5 miles", () => {
    expect(proximityScore(5)).toBe(0.5);
  });

  it("returns ~0.333 at 10 miles", () => {
    expect(proximityScore(10)).toBeCloseTo(1 / 3, 5);
  });

  it("approaches 0 for very large distances", () => {
    const score = proximityScore(10000);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.01);
  });

  it("decays smoothly (closer is always higher)", () => {
    expect(proximityScore(1)).toBeGreaterThan(proximityScore(2));
    expect(proximityScore(2)).toBeGreaterThan(proximityScore(5));
    expect(proximityScore(5)).toBeGreaterThan(proximityScore(10));
  });
});

describe("relevanceScore", () => {
  it("returns maximum score (1.0) for consistently + 0 distance", () => {
    // pace_score=1.0, proximity=1.0
    // relevance = 1.0*0.6 + 1.0*0.4 = 1.0
    expect(relevanceScore("consistently", 0)).toBe(1.0);
  });

  it("returns minimum pace with 0 distance correctly", () => {
    // pace_score=0.1, proximity=1.0
    // relevance = 0.1*0.6 + 1.0*0.4 = 0.06 + 0.4 = 0.46
    expect(relevanceScore("rarely", 0)).toBeCloseTo(0.46, 5);
  });

  it("calculates correctly for frequently at 5 miles", () => {
    // pace_score=0.7, proximity=0.5
    // relevance = 0.7*0.6 + 0.5*0.4 = 0.42 + 0.2 = 0.62
    expect(relevanceScore("frequently", 5)).toBeCloseTo(0.62, 5);
  });

  it("calculates correctly for sometimes at 10 miles", () => {
    // pace_score=0.4, proximity=1/3
    // relevance = 0.4*0.6 + (1/3)*0.4 = 0.24 + 0.1333 = 0.3733
    expect(relevanceScore("sometimes", 10)).toBeCloseTo(0.24 + (1 / 3) * 0.4, 5);
  });

  it("weights sum to 1.0", () => {
    expect(PACE_WEIGHT + PROXIMITY_WEIGHT).toBe(1.0);
  });

  it("ranks consistently+close higher than rarely+far", () => {
    const highScore = relevanceScore("consistently", 1);
    const lowScore = relevanceScore("rarely", 20);
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it("handles very large distance gracefully", () => {
    const score = relevanceScore("consistently", 100000);
    // proximity ≈ 0, so score ≈ 1.0 * 0.6 = 0.6
    expect(score).toBeGreaterThan(0.59);
    expect(score).toBeLessThan(0.61);
  });
});
