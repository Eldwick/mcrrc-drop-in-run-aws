"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LocationSearch } from "./LocationSearch";
import { PaceSelector } from "./PaceSelector";
import type { PaceSelectorHandle } from "./PaceSelector";
import type { PaceRange, GeocodeResult } from "@/lib/types/run";
import { PACE_RANGE_LABELS } from "@/lib/types/run";

interface FloatingSearchBarProps {
  locationQuery: string;
  onLocationQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  debouncedGeocodeAddress: (query: string) => void;
  geocodeResults: GeocodeResult[];
  isGeocoding: boolean;
  geocodeError: string | null;
  onSelectGeoResult: (result: GeocodeResult) => void;
  onClearLocation: () => void;
  hasLocation: boolean;
  selectedPace: PaceRange | null;
  onSelectPace: (pace: PaceRange) => void;
  locationDisplayName: string | null;
}

export const FloatingSearchBar = ({
  locationQuery,
  onLocationQueryChange,
  onSearch,
  debouncedGeocodeAddress,
  geocodeResults,
  isGeocoding,
  geocodeError,
  onSelectGeoResult,
  onClearLocation,
  hasLocation,
  selectedPace,
  onSelectPace,
  locationDisplayName,
}: FloatingSearchBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const paceSelectorRef = useRef<PaceSelectorHandle>(null);

  const collapse = useCallback(() => setIsExpanded(false), []);

  const handleLocationQueryChange = useCallback(
    (query: string) => {
      onLocationQueryChange(query);
      debouncedGeocodeAddress(query);
    },
    [onLocationQueryChange, debouncedGeocodeAddress]
  );

  // Click-outside handler
  useEffect(() => {
    if (!isExpanded) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        collapse();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isExpanded, collapse]);

  const handleSelectGeoResult = useCallback(
    (result: GeocodeResult) => {
      onSelectGeoResult(result);
      // Auto-collapse if pace is already set
      if (selectedPace) {
        collapse();
      } else {
        // Auto-focus the pace selector so user can pick pace via keyboard
        requestAnimationFrame(() => {
          paceSelectorRef.current?.focus();
        });
      }
    },
    [onSelectGeoResult, selectedPace, collapse]
  );

  const handleSelectPace = useCallback(
    (pace: PaceRange) => {
      onSelectPace(pace);
      // Auto-collapse if location is already set
      if (hasLocation) {
        collapse();
      }
    },
    [onSelectPace, hasLocation, collapse]
  );

  const summaryText = (() => {
    if (locationDisplayName && selectedPace) {
      return `${locationDisplayName} \u2014 ${PACE_RANGE_LABELS[selectedPace]}`;
    }
    if (locationDisplayName) {
      return `${locationDisplayName} \u2014 tap to select pace`;
    }
    return null;
  })();

  return (
    <div
      ref={barRef}
      className="relative"
    >
      <div className="rounded-2xl bg-white shadow-lg">
        {isExpanded ? (
          <div className="p-3">
            <LocationSearch
              query={locationQuery}
              onQueryChange={handleLocationQueryChange}
              onSearch={onSearch}
              geocodeResults={geocodeResults}
              isGeocoding={isGeocoding}
              geocodeError={geocodeError}
              onSelectResult={handleSelectGeoResult}
              onClear={onClearLocation}
              hasLocation={hasLocation}
              autoFocus={true}
            />
            <div className="mt-2">
              <PaceSelector
                ref={paceSelectorRef}
                selectedPace={selectedPace}
                onSelectPace={handleSelectPace}
                highlight={hasLocation}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex w-full items-center gap-2 rounded-2xl p-3 text-left"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 text-brand-purple"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                clipRule="evenodd"
              />
            </svg>
            <span className={`truncate text-sm ${
              locationDisplayName && !selectedPace ? "text-brand-orange" : "text-gray-600"
            }`}>
              {summaryText ?? "Where do you want to run?"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
