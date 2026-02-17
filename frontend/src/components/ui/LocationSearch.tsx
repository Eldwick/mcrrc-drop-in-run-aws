"use client";

import { useState, useCallback } from "react";
import type { GeocodeResult } from "@/lib/types/run";

interface LocationSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  geocodeResults: GeocodeResult[];
  isGeocoding: boolean;
  geocodeError: string | null;
  onSelectResult: (result: GeocodeResult) => void;
  onClear: () => void;
  hasLocation: boolean;
  autoFocus?: boolean;
}

export const LocationSearch = ({
  query,
  onQueryChange,
  onSearch,
  geocodeResults,
  isGeocoding,
  geocodeError,
  onSelectResult,
  onClear,
  hasLocation,
  autoFocus,
}: LocationSearchProps) => {
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (geocodeResults.length > 0) {
      const idx = highlightIndex >= 0 ? highlightIndex : 0;
      onSelectResult(geocodeResults[idx]);
      setHighlightIndex(-1);
    } else {
      onSearch(query);
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (geocodeResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < geocodeResults.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : geocodeResults.length - 1
        );
      }
    },
    [geocodeResults.length]
  );

  const handleQueryChange = (value: string) => {
    setHighlightIndex(-1);
    onQueryChange(value);
  };

  return (
    <div className="relative">
      <label
        htmlFor="location-input"
        className="mb-1.5 block text-xs font-medium text-gray-500"
      >
        Location
      </label>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {/* Pin icon prefix */}
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-purple">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            id="location-input"
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 20814 or Bethesda"
            aria-label="Search location"
            role="combobox"
            aria-expanded={geocodeResults.length > 0}
            aria-activedescendant={
              highlightIndex >= 0
                ? `location-option-${highlightIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls="location-listbox"
            autoFocus={autoFocus}
            className="h-11 w-full rounded-md border border-gray-300 pl-9 pr-10 text-base focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
          />
          {isGeocoding ? (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <span className="text-sm text-gray-400">...</span>
            </div>
          ) : hasLocation ? (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear location"
            >
              ✕
            </button>
          ) : query.trim() ? (
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-brand-purple px-2 py-1 text-white hover:bg-brand-orange"
              aria-label="Search location"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </form>

      {geocodeError && (
        <p className="mt-1 text-xs text-red-600">{geocodeError}</p>
      )}

      {geocodeResults.length > 0 && (
        <ul
          id="location-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-[1000] mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {geocodeResults.map((result, i) => (
            <li
              key={i}
              id={`location-option-${i}`}
              role="option"
              aria-selected={i === highlightIndex}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectResult(result);
                  setHighlightIndex(-1);
                }}
                className={`w-full px-3 py-2 text-left text-sm text-gray-700 ${
                  i === highlightIndex
                    ? "bg-orange-50"
                    : "hover:bg-orange-50"
                }`}
              >
                {result.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
