"use client";

import { LocationSearch } from "./LocationSearch";
import { PaceSelector } from "./PaceSelector";
import type { PaceRange, GeocodeResult } from "@/lib/types/run";

interface SearchControlsProps {
  locationQuery: string;
  onLocationQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  geocodeResults: GeocodeResult[];
  isGeocoding: boolean;
  geocodeError: string | null;
  onSelectGeoResult: (result: GeocodeResult) => void;
  onClearLocation: () => void;
  hasLocation: boolean;
  selectedPace: PaceRange | null;
  onSelectPace: (pace: PaceRange) => void;
}

export const SearchControls = ({
  locationQuery,
  onLocationQueryChange,
  onSearch,
  geocodeResults,
  isGeocoding,
  geocodeError,
  onSelectGeoResult,
  onClearLocation,
  hasLocation,
  selectedPace,
  onSelectPace,
}: SearchControlsProps) => {
  return (
    <div className="border-b border-gray-200 bg-white px-3 py-2 shadow-sm">
      <LocationSearch
        query={locationQuery}
        onQueryChange={onLocationQueryChange}
        onSearch={onSearch}
        geocodeResults={geocodeResults}
        isGeocoding={isGeocoding}
        geocodeError={geocodeError}
        onSelectResult={onSelectGeoResult}
        onClear={onClearLocation}
        hasLocation={hasLocation}
      />
      <div className="mt-2">
        <PaceSelector selectedPace={selectedPace} onSelectPace={onSelectPace} />
      </div>
    </div>
  );
};
