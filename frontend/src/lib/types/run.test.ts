import { describe, it, expect } from "vitest";
import {
  createRunSchema,
  updateRunSchema,
  seekerQuerySchema,
  paceGroupSchema,
} from "./run";

const validPaceGroups = {
  sub_8: "consistently",
  "8_to_9": "frequently",
  "9_to_10": "sometimes",
  "10_plus": "rarely",
} as const;

const validCreateInput = {
  name: "Bethesda Tuesday Track",
  dayOfWeek: "Tuesday" as const,
  startTime: "6:00 AM",
  locationName: "Bethesda-Chevy Chase High School track",
  latitude: 38.9849,
  longitude: -77.0941,
  typicalDistances: "4-6 miles",
  terrain: "Road" as const,
  paceGroups: validPaceGroups,
};

describe("paceGroupSchema", () => {
  it("accepts valid pace groups", () => {
    const result = paceGroupSchema.safeParse(validPaceGroups);
    expect(result.success).toBe(true);
  });

  it("rejects invalid availability level", () => {
    const result = paceGroupSchema.safeParse({
      ...validPaceGroups,
      sub_8: "always",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing pace range key", () => {
    const { sub_8: _sub8, ...missing } = validPaceGroups;
    const result = paceGroupSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });
});

describe("createRunSchema", () => {
  it("accepts valid create input with all required fields", () => {
    const result = createRunSchema.safeParse(validCreateInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with optional fields", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      contactName: "Sarah Chen",
      contactEmail: "sarah@example.com",
      contactPhone: "301-555-0100",
      notes: "Bring headlamp in winter.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for optional fields", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("allows optional fields to be omitted", () => {
    const result = createRunSchema.safeParse(validCreateInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactName).toBeUndefined();
      expect(result.data.contactEmail).toBeUndefined();
    }
  });

  it("rejects missing required field (name)", () => {
    const { name: _name, ...noName } = validCreateInput;
    const result = createRunSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid terrain value", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      terrain: "Gravel",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid day of week", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      dayOfWeek: "Funday",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid availability level in pace groups", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      paceGroups: { ...validPaceGroups, "8_to_9": "never" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects latitude below -90", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      latitude: -91,
    });
    expect(result.success).toBe(false);
  });

  it("rejects latitude above 90", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      latitude: 91,
    });
    expect(result.success).toBe(false);
  });

  it("rejects longitude below -180", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      longitude: -181,
    });
    expect(result.success).toBe(false);
  });

  it("rejects longitude above 180", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      longitude: 181,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = createRunSchema.safeParse({
      ...validCreateInput,
      contactEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateRunSchema", () => {
  it("accepts valid partial update with a single field", () => {
    const result = updateRunSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateRunSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts isActive boolean", () => {
    const result = updateRunSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it("accepts full update matching create schema", () => {
    const result = updateRunSchema.safeParse(validCreateInput);
    expect(result.success).toBe(true);
  });

  it("rejects invalid terrain in partial update", () => {
    const result = updateRunSchema.safeParse({ terrain: "Sand" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid latitude in partial update", () => {
    const result = updateRunSchema.safeParse({ latitude: 91 });
    expect(result.success).toBe(false);
  });
});

describe("seekerQuerySchema", () => {
  it("accepts valid seeker query", () => {
    const result = seekerQuerySchema.safeParse({
      latitude: 39.14,
      longitude: -77.15,
      paceRange: "8_to_9",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid pace ranges", () => {
    for (const pace of ["sub_8", "8_to_9", "9_to_10", "10_plus"]) {
      const result = seekerQuerySchema.safeParse({
        latitude: 39.14,
        longitude: -77.15,
        paceRange: pace,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid pace range", () => {
    const result = seekerQuerySchema.safeParse({
      latitude: 39.14,
      longitude: -77.15,
      paceRange: "7_to_8",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing latitude", () => {
    const result = seekerQuerySchema.safeParse({
      longitude: -77.15,
      paceRange: "sub_8",
    });
    expect(result.success).toBe(false);
  });

  it("rejects latitude out of range", () => {
    const result = seekerQuerySchema.safeParse({
      latitude: 91,
      longitude: -77.15,
      paceRange: "sub_8",
    });
    expect(result.success).toBe(false);
  });
});
