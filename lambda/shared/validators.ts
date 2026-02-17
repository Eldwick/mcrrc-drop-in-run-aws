import { z } from "zod";

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

export type CreateRunInput = z.infer<typeof createRunSchema>;
export type UpdateRunInput = z.infer<typeof updateRunSchema>;
