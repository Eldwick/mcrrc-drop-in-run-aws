"use client";

import dynamic from "next/dynamic";
import type { RunResponse } from "@/lib/types/run";

const RunMap = dynamic(
  () => import("./RunMap").then((mod) => mod.RunMap),
  { ssr: false, loading: () => <MapPlaceholder /> }
);

const MapPlaceholder = () => {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <p className="text-gray-500">Loading map...</p>
    </div>
  );
};

interface DynamicRunMapProps {
  runs: RunResponse[];
  userLocation?: { lat: number; lng: number } | null;
  selectedRunId?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (runId: string) => void;
}

export const DynamicRunMap = ({
  runs,
  userLocation,
  selectedRunId,
  onMapClick,
  onMarkerClick,
}: DynamicRunMapProps) => {
  return (
    <RunMap
      runs={runs}
      userLocation={userLocation}
      selectedRunId={selectedRunId}
      onMapClick={onMapClick}
      onMarkerClick={onMarkerClick}
    />
  );
};
