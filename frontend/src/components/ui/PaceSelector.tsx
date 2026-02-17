"use client";

import { forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import { PACE_RANGE_LABELS } from "@/lib/types/run";
import type { PaceRange } from "@/lib/types/run";

const paceRangeKeys: PaceRange[] = ["sub_8", "8_to_9", "9_to_10", "10_plus"];

export interface PaceSelectorHandle {
  focus: () => void;
}

interface PaceSelectorProps {
  selectedPace: PaceRange | null;
  onSelectPace: (pace: PaceRange) => void;
  highlight?: boolean;
}

export const PaceSelector = forwardRef<PaceSelectorHandle, PaceSelectorProps>(
  ({ selectedPace, onSelectPace, highlight }, ref) => {
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useImperativeHandle(ref, () => ({
      focus() {
        const idx = selectedPace ? paceRangeKeys.indexOf(selectedPace) : 0;
        buttonRefs.current[idx]?.focus();
      },
    }));

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex: number | null = null;

        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          nextIndex = (index + 1) % paceRangeKeys.length;
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          nextIndex = (index - 1 + paceRangeKeys.length) % paceRangeKeys.length;
        }

        if (nextIndex !== null) {
          buttonRefs.current[nextIndex]?.focus();
        }
      },
      []
    );

    const selectedIndex = selectedPace ? paceRangeKeys.indexOf(selectedPace) : 0;

    return (
      <div>
        <p
          className={`mb-1.5 text-xs font-medium ${
            highlight && !selectedPace ? "text-brand-orange" : "text-gray-500"
          }`}
        >
          {highlight && !selectedPace
            ? "Select your pace (min/mile)"
            : "Your pace (min/mile)"}
        </p>
        <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Pace range">
          {paceRangeKeys.map((pace, index) => (
            <button
              key={pace}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selectedPace === pace}
              tabIndex={index === selectedIndex ? 0 : -1}
              onClick={() => onSelectPace(pace)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`rounded-md px-2 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-1 ${
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
  }
);

PaceSelector.displayName = "PaceSelector";
