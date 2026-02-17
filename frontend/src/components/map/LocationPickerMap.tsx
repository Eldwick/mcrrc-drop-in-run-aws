"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [39.14, -77.15];
const DEFAULT_ZOOM = 11;

const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapClickHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

const MapClickHandler = ({ onLocationSelect }: MapClickHandlerProps) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

interface FlyToControllerProps {
  flyTo: { lat: number; lng: number } | null;
}

const FlyToController = ({ flyTo }: FlyToControllerProps) => {
  const map = useMap();

  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lng], 15);
    }
  }, [map, flyTo]);

  return null;
};

interface LocationPickerMapProps {
  pin: { lat: number; lng: number } | null;
  flyTo: { lat: number; lng: number } | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

export const LocationPickerMap = ({
  pin,
  flyTo,
  onLocationSelect,
}: LocationPickerMapProps) => {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-[250px] w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onLocationSelect={onLocationSelect} />
      <FlyToController flyTo={flyTo} />

      {pin && (
        <Marker position={[pin.lat, pin.lng]} icon={pinIcon} />
      )}
    </MapContainer>
  );
};
