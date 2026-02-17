import { describe, it, expect } from "vitest";
import { rankRuns } from "./ranking";
import type { RunResponse } from "@/lib/types/run";

function makeRun(overrides: Partial<RunResponse> & { id: number }): RunResponse {
  return {
    name: `Run ${overrides.id}`,
    dayOfWeek: "Tuesday",
    startTime: "6:30 AM",
    locationName: "Test Location",
    latitude: 39.14,
    longitude: -77.15,
    typicalDistances: "4 miles",
    terrain: "Road",
    paceGroups: {
      sub_8: "rarely",
      "8_to_9": "rarely",
      "9_to_10": "rarely",
      "10_plus": "rarely",
    },
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    notes: null,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("rankRuns", () => {
  it("returns empty array for empty input", () => {
    const result = rankRuns([], 39.14, -77.15, "sub_8");
    expect(result).toEqual([]);
  });

  it("returns results sorted by relevance descending", () => {
    const runs = [
      makeRun({
        id: 1,
        paceGroups: {
          sub_8: "rarely",
          "8_to_9": "rarely",
          "9_to_10": "rarely",
          "10_plus": "rarely",
        },
      }),
      makeRun({
        id: 2,
        paceGroups: {
          sub_8: "consistently",
          "8_to_9": "rarely",
          "9_to_10": "rarely",
          "10_plus": "rarely",
        },
      }),
      makeRun({
        id: 3,
        paceGroups: {
          sub_8: "frequently",
          "8_to_9": "rarely",
          "9_to_10": "rarely",
          "10_plus": "rarely",
        },
      }),
    ];

    const result = rankRuns(runs, 39.14, -77.15, "sub_8");

    expect(result[0].run.id).toBe(2);
    expect(result[1].run.id).toBe(3);
    expect(result[2].run.id).toBe(1);
    expect(result[0].relevanceScore).toBeGreaterThan(result[1].relevanceScore);
    expect(result[1].relevanceScore).toBeGreaterThan(result[2].relevanceScore);
  });

  it("reads the correct pace group for the selected range", () => {
    const run = makeRun({
      id: 1,
      paceGroups: {
        sub_8: "rarely",
        "8_to_9": "consistently",
        "9_to_10": "sometimes",
        "10_plus": "frequently",
      },
    });

    const result8to9 = rankRuns([run], 39.14, -77.15, "8_to_9");
    expect(result8to9[0].paceMatch).toBe("consistently");

    const result9to10 = rankRuns([run], 39.14, -77.15, "9_to_10");
    expect(result9to10[0].paceMatch).toBe("sometimes");

    const result10plus = rankRuns([run], 39.14, -77.15, "10_plus");
    expect(result10plus[0].paceMatch).toBe("frequently");
  });

  it("computes distance correctly", () => {
    // Bethesda (~39.0, -77.1) to Rockville (~39.08, -77.15)
    const run = makeRun({
      id: 1,
      latitude: 39.08,
      longitude: -77.15,
    });

    const result = rankRuns([run], 39.0, -77.1, "sub_8");

    expect(result[0].distanceMiles).toBeGreaterThan(0);
    expect(result[0].distanceMiles).toBeLessThan(10);
  });

  it("ranks closer run higher when pace match is equal", () => {
    const closeRun = makeRun({
      id: 1,
      latitude: 39.141,
      longitude: -77.151,
      paceGroups: {
        sub_8: "consistently",
        "8_to_9": "rarely",
        "9_to_10": "rarely",
        "10_plus": "rarely",
      },
    });
    const farRun = makeRun({
      id: 2,
      latitude: 39.3,
      longitude: -77.4,
      paceGroups: {
        sub_8: "consistently",
        "8_to_9": "rarely",
        "9_to_10": "rarely",
        "10_plus": "rarely",
      },
    });

    const result = rankRuns([farRun, closeRun], 39.14, -77.15, "sub_8");

    expect(result[0].run.id).toBe(1);
    expect(result[1].run.id).toBe(2);
    expect(result[0].distanceMiles).toBeLessThan(result[1].distanceMiles);
  });

  it("includes all input runs in the output", () => {
    const runs = [makeRun({ id: 1 }), makeRun({ id: 2 }), makeRun({ id: 3 })];
    const result = rankRuns(runs, 39.14, -77.15, "sub_8");
    expect(result).toHaveLength(3);
  });
});
