import { z } from "zod";
import type { AvailabilityLevel } from "@/lib/utils/scoring";

const availabilityLevels = [
  "consistently",
  "frequently",
  "sometimes",
  "rarely",
] as const;

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const terrainTypes = ["Road", "Trail", "Mixed", "Track"] as const;

const paceRanges = ["sub_8", "8_to_9", "9_to_10", "10_plus"] as const;

export type PaceRange = (typeof paceRanges)[number];

export const PACE_RANGE_LABELS: Record<PaceRange, string> = {
  sub_8: "< 8:00",
  "8_to_9": "8:00–9:00",
  "9_to_10": "9:00–10:00",
  "10_plus": "10:00+",
};

export interface RankedRun {
  run: RunResponse;
  relevanceScore: number;
  distanceMiles: number;
  paceMatch: AvailabilityLevel;
}

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

export const paceGroupSchema = z.object({
  sub_8: z.enum(availabilityLevels),
  "8_to_9": z.enum(availabilityLevels),
  "9_to_10": z.enum(availabilityLevels),
  "10_plus": z.enum(availabilityLevels),
});

export const createRunSchema = z.object({
  name: z.string().min(1),
  dayOfWeek: z.enum(daysOfWeek),
  startTime: z.string().min(1),
  locationName: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  typicalDistances: z.string().min(1),
  terrain: z.enum(terrainTypes),
  paceGroups: paceGroupSchema,
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateRunSchema = createRunSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const seekerQuerySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  paceRange: z.enum(paceRanges),
});

export type CreateRunInput = z.infer<typeof createRunSchema>;
export type UpdateRunInput = z.infer<typeof updateRunSchema>;
export type SeekerQuery = z.infer<typeof seekerQuerySchema>;
export type PaceGroupInput = z.infer<typeof paceGroupSchema>;

export interface RunFormInitialData {
  name: string;
  dayOfWeek: string;
  startTime: string;
  locationName: string;
  latitude: number;
  longitude: number;
  typicalDistances: string;
  terrain: string;
  paceGroups: PaceGroupInput;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface RunResponse {
  id: number;
  name: string;
  dayOfWeek: string;
  startTime: string;
  locationName: string;
  latitude: number;
  longitude: number;
  typicalDistances: string;
  terrain: string;
  paceGroups: PaceGroupInput;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
