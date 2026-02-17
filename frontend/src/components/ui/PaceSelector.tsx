"use client";

import { PACE_RANGE_LABELS } from "@/lib/types/run";
import type { PaceRange } from "@/lib/types/run";

const paceRangeKeys: PaceRange[] = ["sub_8", "8_to_9", "9_to_10", "10_plus"];

interface PaceSelectorProps {
  selectedPace: PaceRange | null;
  onSelectPace: (pace: PaceRange) => void;
  highlight?: boolean;
}

export const PaceSelector = ({ selectedPace, onSelectPace, highlight }: PaceSelectorProps) => {
  return (
    <div>
      <p className={`mb-1.5 text-xs font-medium ${
        highlight && !selectedPace
          ? "text-brand-orange"
          : "text-gray-500"
      }`}>
        {highlight && !selectedPace ? "Select your pace (min/mile)" : "Your pace (min/mile)"}
      </p>
      <div className="grid grid-cols-4 gap-1">
        {paceRangeKeys.map((pace) => (
        <button
          key={pace}
          type="button"
          onClick={() => onSelectPace(pace)}
          className={`rounded-md px-2 py-2 text-xs font-medium transition-colors ${
            selectedPace === pace
              ? "bg-brand-purple text-white"
              : "bg-brand-gray text-gray-600 hover:bg-gray-200"
          }`}
        >
          {PACE_RANGE_LABELS[pace]}
        </button>
        ))}
      </div>
    </div>
  );
};
