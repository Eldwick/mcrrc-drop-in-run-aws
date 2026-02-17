"use client";

import { useCallback } from "react";
import { useSeekerState } from "@/hooks/useSeekerState";
import { FloatingSearchBar } from "@/components/ui/FloatingSearchBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DynamicRunMap } from "@/components/map/DynamicRunMap";
import { RunCardList } from "@/components/ui/RunCardList";
import type { RunResponse, GeocodeResult, PaceRange, RankedRun } from "@/lib/types/run";
import type { SheetSnapState } from "@/hooks/useSeekerState";

const HEADER_HEIGHT = 49;

interface SeekerViewProps {
  runs: RunResponse[];
}

function getSummaryText(
  rankedRuns: RankedRun[] | null,
  runs: RunResponse[]
): string {
  if (rankedRuns === null) return `${runs.length} runs nearby`;
  if (rankedRuns.length === 0) return "No matching runs";
  return `${rankedRuns.length} runs found`;
}

export const SeekerView = ({ runs }: SeekerViewProps) => {
  const { state, dispatch, rankedRuns, geocodeAddress, debouncedGeocodeAddress } = useSeekerState(runs);

  const handleLocationQueryChange = useCallback(
    (query: string) => {
      dispatch({ type: "SET_LOCATION_QUERY", query });
    },
    [dispatch]
  );

  const handleSearch = useCallback(
    (query: string) => {
      geocodeAddress(query);
    },
    [geocodeAddress]
  );

  const handleSelectGeoResult = useCallback(
    (result: GeocodeResult) => {
      dispatch({
        type: "SET_USER_LOCATION",
        location: { lat: result.lat, lng: result.lng },
        displayName: result.displayName,
      });
    },
    [dispatch]
  );

  const handleClearLocation = useCallback(() => {
    dispatch({ type: "CLEAR_LOCATION" });
  }, [dispatch]);

  const handleSelectPace = useCallback(
    (pace: PaceRange) => {
      dispatch({ type: "SET_SELECTED_PACE", pace });
    },
    [dispatch]
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      dispatch({
        type: "SET_USER_LOCATION",
        location: { lat, lng },
        displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });
    },
    [dispatch]
  );

  const scrollCardIntoView = useCallback((runId: number) => {
    setTimeout(() => {
      const card = document.getElementById(`run-card-${runId}`);
      if (!card) return;
      const scrollContainer = card.closest(
        "[data-bottom-sheet-scroll]"
      ) as HTMLElement | null;
      if (!scrollContainer) return;
      // Use bounding rects to get the card's actual position relative to
      // the scroll container, since the container is much taller than the
      // visible collapsed peek area and scrollIntoView can't account for that.
      const containerRect = scrollContainer.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const offset =
        cardRect.top - containerRect.top + scrollContainer.scrollTop;
      scrollContainer.scrollTo({ top: offset - 8, behavior: "smooth" });
    }, 400);
  }, []);

  const handleMarkerClick = useCallback(
    (runId: number) => {
      dispatch({ type: "SELECT_RUN", runId });
      scrollCardIntoView(runId);
    },
    [dispatch, scrollCardIntoView]
  );

  const handleCardSelect = useCallback(
    (runId: number) => {
      dispatch({ type: "SELECT_RUN", runId });
      scrollCardIntoView(runId);
    },
    [dispatch, scrollCardIntoView]
  );

  const handleSheetStateChange = useCallback(
    (sheetState: SheetSnapState) => {
      dispatch({ type: "SET_SHEET_STATE", sheetState });
    },
    [dispatch]
  );

  return (
    <>
      {/* Layer 1: Full-screen map below header */}
      <div
        className="fixed inset-x-0 bottom-0 z-0"
        style={{ top: HEADER_HEIGHT }}
      >
        <DynamicRunMap
          runs={runs}
          userLocation={state.userLocation}
          selectedRunId={state.selectedRunId}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {/* Layer 2: Floating search bar */}
      <div
        className="fixed left-4 right-4 z-20 mx-auto max-w-lg"
        style={{ top: HEADER_HEIGHT + 32 }}
      >
        <FloatingSearchBar
          locationQuery={state.locationQuery}
          onLocationQueryChange={handleLocationQueryChange}
          onSearch={handleSearch}
          debouncedGeocodeAddress={debouncedGeocodeAddress}
          geocodeResults={state.geocodeResults}
          isGeocoding={state.isGeocoding}
          geocodeError={state.geocodeError}
          onSelectGeoResult={handleSelectGeoResult}
          onClearLocation={handleClearLocation}
          hasLocation={state.userLocation !== null}
          selectedPace={state.selectedPace}
          onSelectPace={handleSelectPace}
          locationDisplayName={
            state.userLocation ? state.locationQuery : null
          }
        />
      </div>

      {/* Layer 3: Bottom sheet with cards */}
      <BottomSheet
        snapState={state.sheetState}
        onSnapStateChange={handleSheetStateChange}
        summary={getSummaryText(rankedRuns, runs)}
        collapsedHeight={state.selectedRunId !== null ? 250 : undefined}
      >
        <RunCardList
          runs={runs}
          rankedRuns={rankedRuns}
          selectedRunId={state.selectedRunId}
          onSelectRun={handleCardSelect}
        />
      </BottomSheet>
    </>
  );
};
