"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RunResponse } from "@/lib/types/run";

const DEFAULT_CENTER: [number, number] = [39.14, -77.15];
const DEFAULT_ZOOM = 11;

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapControllerProps {
  userLocation: { lat: number; lng: number } | null;
  selectedRunId: number | null;
  runs: RunResponse[];
}

const MapController = ({
  userLocation,
  selectedRunId,
  runs,
}: MapControllerProps) => {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 12);
    }
  }, [map, userLocation]);

  useEffect(() => {
    if (selectedRunId != null) {
      const run = runs.find((r) => r.id === selectedRunId);
      if (run) {
        map.flyTo([run.latitude, run.longitude], 13);
      }
    }
  }, [map, selectedRunId, runs]);

  return null;
};

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
}

const MapClickHandler = ({ onMapClick }: MapClickHandlerProps) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

interface RunMapProps {
  runs: RunResponse[];
  userLocation?: { lat: number; lng: number } | null;
  selectedRunId?: number | null;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (runId: number) => void;
}

export const RunMap = ({
  runs,
  userLocation,
  selectedRunId,
  onMapClick,
  onMarkerClick,
}: RunMapProps) => {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController
        userLocation={userLocation ?? null}
        selectedRunId={selectedRunId ?? null}
        runs={runs}
      />

      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={10}
          pathOptions={{
            fillColor: "#E97E12",
            fillOpacity: 1,
            color: "#ffffff",
            weight: 3,
          }}
        >
          <Tooltip>Your location</Tooltip>
        </CircleMarker>
      )}

      {runs.map((run) => (
        <Marker
          key={run.id}
          position={[run.latitude, run.longitude]}
          icon={run.id === selectedRunId ? selectedIcon : defaultIcon}
          eventHandlers={{
            click: () => onMarkerClick?.(run.id),
          }}
        />
      ))}
    </MapContainer>
  );
};
