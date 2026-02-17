"use client";

import { useReducer, useMemo, useCallback, useRef, useEffect } from "react";
import { rankRuns } from "@/lib/utils/ranking";
import type { RunResponse, PaceRange, RankedRun, GeocodeResult } from "@/lib/types/run";

export type SheetSnapState = "collapsed" | "half" | "full";

interface SeekerState {
  locationQuery: string;
  userLocation: { lat: number; lng: number } | null;
  selectedPace: PaceRange | null;
  selectedRunId: number | null;
  geocodeResults: GeocodeResult[];
  isGeocoding: boolean;
  geocodeError: string | null;
  sheetState: SheetSnapState;
}

type SeekerAction =
  | { type: "SET_LOCATION_QUERY"; query: string }
  | { type: "SET_USER_LOCATION"; location: { lat: number; lng: number }; displayName?: string }
  | { type: "SET_SELECTED_PACE"; pace: PaceRange }
  | { type: "SELECT_RUN"; runId: number | null }
  | { type: "GEOCODE_START" }
  | { type: "GEOCODE_SUCCESS"; results: GeocodeResult[] }
  | { type: "GEOCODE_ERROR"; error: string }
  | { type: "CLEAR_GEOCODE_RESULTS" }
  | { type: "CLEAR_LOCATION" }
  | { type: "SET_SHEET_STATE"; sheetState: SheetSnapState };

export const initialState: SeekerState = {
  locationQuery: "",
  userLocation: null,
  selectedPace: null,
  selectedRunId: null,
  geocodeResults: [],
  isGeocoding: false,
  geocodeError: null,
  sheetState: "collapsed",
};

export function seekerReducer(state: SeekerState, action: SeekerAction): SeekerState {
  switch (action.type) {
    case "SET_LOCATION_QUERY":
      return { ...state, locationQuery: action.query, geocodeError: null };
    case "SET_USER_LOCATION": {
      const newState = {
        ...state,
        userLocation: action.location,
        locationQuery: action.displayName ?? state.locationQuery,
        geocodeResults: [],
        geocodeError: null,
      };
      // Auto-open sheet when both location and pace are now set
      if (state.selectedPace && !state.userLocation && newState.sheetState === "collapsed") {
        newState.sheetState = "half";
      }
      return newState;
    }
    case "SET_SELECTED_PACE": {
      const newState = { ...state, selectedPace: action.pace };
      // Auto-open sheet when both location and pace are now set
      if (state.userLocation && !state.selectedPace && newState.sheetState === "collapsed") {
        newState.sheetState = "half";
      }
      return newState;
    }
    case "SELECT_RUN": {
      return { ...state, selectedRunId: action.runId, sheetState: "collapsed" };
    }
    case "SET_SHEET_STATE":
      return { ...state, sheetState: action.sheetState };
    case "GEOCODE_START":
      return { ...state, isGeocoding: true, geocodeError: null, geocodeResults: [] };
    case "GEOCODE_SUCCESS":
      return { ...state, isGeocoding: false, geocodeResults: action.results };
    case "GEOCODE_ERROR":
      return { ...state, isGeocoding: false, geocodeError: action.error };
    case "CLEAR_GEOCODE_RESULTS":
      return { ...state, geocodeResults: [], geocodeError: null };
    case "CLEAR_LOCATION":
      return {
        ...state,
        userLocation: null,
        locationQuery: "",
        geocodeResults: [],
        geocodeError: null,
      };
    default:
      return state;
  }
}

export function useSeekerState(runs: RunResponse[]) {
  const [state, dispatch] = useReducer(seekerReducer, initialState);

  const rankedRuns: RankedRun[] | null = useMemo(() => {
    if (!state.userLocation || !state.selectedPace) return null;
    return rankRuns(
      runs,
      state.userLocation.lat,
      state.userLocation.lng,
      state.selectedPace
    );
  }, [runs, state.userLocation, state.selectedPace]);

  const geocodeAddress = useCallback(async (query: string) => {
    if (!query.trim()) return;
    dispatch({ type: "GEOCODE_START" });
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        dispatch({ type: "GEOCODE_ERROR", error: "Geocoding failed" });
        return;
      }
      const json = await res.json();
      const results: GeocodeResult[] = json.data;
      if (results.length === 0) {
        dispatch({ type: "GEOCODE_ERROR", error: "No results found" });
      } else if (results.length === 1) {
        dispatch({
          type: "SET_USER_LOCATION",
          location: { lat: results[0].lat, lng: results[0].lng },
          displayName: results[0].displayName,
        });
      } else {
        dispatch({ type: "GEOCODE_SUCCESS", results });
      }
    } catch {
      dispatch({ type: "GEOCODE_ERROR", error: "Geocoding request failed" });
    }
  }, []);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedGeocodeAddress = useCallback(
    (query: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!query.trim()) {
        dispatch({ type: "CLEAR_GEOCODE_RESULTS" });
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        geocodeAddress(query);
      }, 1500);
    },
    [geocodeAddress]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { state, dispatch, rankedRuns, geocodeAddress, debouncedGeocodeAddress };
}
