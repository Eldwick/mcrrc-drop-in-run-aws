"use client";

import Link from "next/link";
import type { RunResponse } from "@/lib/types/run";
import type { AvailabilityLevel } from "@/lib/utils/scoring";

interface RunCardProps {
  run: RunResponse;
  distanceMiles?: number;
  paceMatch?: AvailabilityLevel;
  isSelected: boolean;
  onSelect: (runId: number) => void;
}

const paceMatchColors: Record<AvailabilityLevel, string> = {
  consistently: "text-green-700",
  frequently: "text-green-600",
  sometimes: "text-yellow-600",
  rarely: "text-gray-500",
};

const paceMatchLabels: Record<AvailabilityLevel, string> = {
  consistently: "Consistently has your pace",
  frequently: "Frequently has your pace",
  sometimes: "Sometimes has your pace",
  rarely: "Rarely has your pace",
};

const terrainColors: Record<string, string> = {
  Road: "bg-gray-100 text-gray-700",
  Trail: "bg-green-100 text-green-700",
  Mixed: "bg-amber-100 text-amber-700",
  Track: "bg-blue-100 text-blue-700",
};

export const RunCard = ({
  run,
  distanceMiles,
  paceMatch,
  isSelected,
  onSelect,
}: RunCardProps) => {
  return (
    <div
      id={`run-card-${run.id}`}
      onClick={() => onSelect(run.id)}
      className={`cursor-pointer rounded-lg border bg-white p-3 transition-shadow hover:shadow-md ${
        isSelected ? "ring-2 ring-brand-purple border-purple-300" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/runs/${run.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold text-brand-purple hover:text-brand-orange hover:underline"
        >
          {run.name}
        </Link>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            terrainColors[run.terrain] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {run.terrain}
        </span>
      </div>

      <p className="mt-1 text-xs text-gray-600">
        {run.dayOfWeek}s at {run.startTime}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
        {distanceMiles != null && (
          <span className="text-xs text-gray-500">
            {distanceMiles.toFixed(1)} mi away
          </span>
        )}
        {paceMatch && (
          <span className={`text-xs font-medium ${paceMatchColors[paceMatch]}`}>
            {paceMatchLabels[paceMatch]}
          </span>
        )}
      </div>

      {run.notes && (
        <p className="mt-1 text-xs text-gray-500">
          {run.notes.length > 80 ? `${run.notes.slice(0, 80)}...` : run.notes}
        </p>
      )}

      {isSelected && (
        <Link
          href={`/runs/${run.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center justify-center gap-1 rounded-md bg-brand-purple py-2 text-sm font-semibold text-white hover:bg-brand-orange"
        >
          View Details
          <span aria-hidden="true">&rarr;</span>
        </Link>
      )}
    </div>
  );
};
