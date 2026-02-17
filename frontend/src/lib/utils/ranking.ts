import { haversineDistance } from "./haversine";
import { relevanceScore } from "./scoring";
import type { AvailabilityLevel } from "./scoring";
import type { RunResponse, PaceRange, RankedRun } from "@/lib/types/run";

export function rankRuns(
  runs: RunResponse[],
  userLat: number,
  userLon: number,
  paceRange: PaceRange
): RankedRun[] {
  return runs
    .map((run) => {
      const distanceMiles = haversineDistance(
        userLat,
        userLon,
        run.latitude,
        run.longitude
      );
      const paceMatch = run.paceGroups[paceRange] as AvailabilityLevel;
      const score = relevanceScore(paceMatch, distanceMiles);

      return {
        run,
        relevanceScore: score,
        distanceMiles,
        paceMatch,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
