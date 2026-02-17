"use client";

import { PACE_RANGE_LABELS, type PaceGroupInput, type PaceRange } from "@/lib/types/run";

const PACE_RANGES: PaceRange[] = ["sub_8", "8_to_9", "9_to_10", "10_plus"];

const AVAILABILITY_LEVELS = [
  { value: "consistently", label: "Consistently" },
  { value: "frequently", label: "Frequently" },
  { value: "sometimes", label: "Sometimes" },
  { value: "rarely", label: "Rarely" },
] as const;

interface PaceGroupSelectorProps {
  value: PaceGroupInput;
  onChange: (value: PaceGroupInput) => void;
  errors?: Record<string, string>;
}

export const PaceGroupSelector = ({
  value,
  onChange,
  errors,
}: PaceGroupSelectorProps) => {
  const handleSelect = (pace: PaceRange, level: PaceGroupInput[PaceRange]) => {
    onChange({ ...value, [pace]: level });
  };

  return (
    <div className="space-y-4">
      {PACE_RANGES.map((pace) => (
        <div key={pace}>
          <p className="mb-1.5 text-sm font-medium text-gray-700">
            {PACE_RANGE_LABELS[pace]}/mi
          </p>
          <div className="grid grid-cols-4 gap-1">
            {AVAILABILITY_LEVELS.map((level) => {
              const isSelected = value[pace] === level.value;
              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => handleSelect(pace, level.value)}
                  className={`rounded-md px-1 py-2 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-brand-purple text-white"
                      : "bg-brand-gray text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {level.label}
                </button>
              );
            })}
          </div>
          {errors?.[pace] && (
            <p className="mt-1 text-xs text-red-600">{errors[pace]}</p>
          )}
        </div>
      ))}
    </div>
  );
};
