"use client";

import dynamic from "next/dynamic";

const LocationPickerMap = dynamic(
  () => import("./LocationPickerMap").then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[250px] w-full items-center justify-center rounded-lg bg-gray-100">
        <p className="text-gray-500">Loading map...</p>
      </div>
    ),
  }
);

interface DynamicLocationPickerMapProps {
  pin: { lat: number; lng: number } | null;
  flyTo: { lat: number; lng: number } | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

export const DynamicLocationPickerMap = ({
  pin,
  flyTo,
  onLocationSelect,
}: DynamicLocationPickerMapProps) => {
  return (
    <LocationPickerMap
      pin={pin}
      flyTo={flyTo}
      onLocationSelect={onLocationSelect}
    />
  );
};
