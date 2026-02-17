"use client";

import dynamic from "next/dynamic";

const DetailMap = dynamic(
  () => import("./DetailMap").then((mod) => mod.DetailMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading map...</p>
      </div>
    ),
  }
);

interface DynamicDetailMapProps {
  latitude: number;
  longitude: number;
}

export const DynamicDetailMap = ({
  latitude,
  longitude,
}: DynamicDetailMapProps) => {
  return <DetailMap latitude={latitude} longitude={longitude} />;
};
