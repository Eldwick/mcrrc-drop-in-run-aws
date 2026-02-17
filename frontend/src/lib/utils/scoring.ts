import { haversineDistance } from "./haversine";

export type AvailabilityLevel =
  | "consistently"
  | "frequently"
  | "sometimes"
  | "rarely";

export const PACE_SCORES: Record<AvailabilityLevel, number> = {
  consistently: 1.0,
  frequently: 0.7,
  sometimes: 0.4,
  rarely: 0.1,
};

export const PACE_WEIGHT = 0.6;
export const PROXIMITY_WEIGHT = 0.4;

export function proximityScore(distanceMiles: number): number {
  return 1 / (1 + distanceMiles / 5);
}

export function relevanceScore(
  paceAvailability: AvailabilityLevel,
  distanceMiles: number
): number {
  const paceScore = PACE_SCORES[paceAvailability];
  const proxScore = proximityScore(distanceMiles);
  return paceScore * PACE_WEIGHT + proxScore * PROXIMITY_WEIGHT;
}

export function relevanceScoreFromCoords(
  paceAvailability: AvailabilityLevel,
  userLat: number,
  userLon: number,
  runLat: number,
  runLon: number
): number {
  const distance = haversineDistance(userLat, userLon, runLat, runLon);
  return relevanceScore(paceAvailability, distance);
}
