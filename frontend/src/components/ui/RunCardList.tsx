"use client";

import Link from "next/link";
import { RunCard } from "./RunCard";
import type { RunResponse, RankedRun } from "@/lib/types/run";

interface RunCardListProps {
  runs: RunResponse[];
  rankedRuns: RankedRun[] | null;
  selectedRunId: number | null;
  onSelectRun: (runId: number) => void;
}

export const RunCardList = ({
  runs,
  rankedRuns,
  selectedRunId,
  onSelectRun,
}: RunCardListProps) => {
  return (
    <div className="space-y-2 py-1">
      {rankedRuns === null ? (
        <>
          <p className="rounded-md bg-purple-50 px-3 py-2 text-center text-sm text-brand-purple">
            Enter your location and pace to see the best runs for you
          </p>
          {runs.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No runs have been added yet.{" "}
              <Link
                href="/runs/new"
                className="font-medium text-brand-purple hover:text-brand-orange"
              >
                Be the first!
              </Link>
            </p>
          ) : (
            runs.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                isSelected={selectedRunId === run.id}
                onSelect={onSelectRun}
              />
            ))
          )}
        </>
      ) : (
        <>
          {rankedRuns.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No runs match your search. Try adjusting your location or pace.
            </p>
          ) : (
            rankedRuns.map(({ run, distanceMiles, paceMatch }) => (
              <RunCard
                key={run.id}
                run={run}
                distanceMiles={distanceMiles}
                paceMatch={paceMatch}
                isSelected={selectedRunId === run.id}
                onSelect={onSelectRun}
              />
            ))
          )}
        </>
      )}
    </div>
  );
};
