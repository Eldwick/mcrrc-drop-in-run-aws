"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  createRunSchema,
  type PaceGroupInput,
  type GeocodeResult,
  type RunFormInitialData,
} from "@/lib/types/run";
import { PaceGroupSelector } from "./PaceGroupSelector";
import { DynamicLocationPickerMap } from "@/components/map/DynamicLocationPickerMap";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const TERRAIN_OPTIONS = ["Road", "Trail", "Mixed", "Track"] as const;

const DEFAULT_PACE_GROUPS: PaceGroupInput = {
  sub_8: "rarely",
  "8_to_9": "rarely",
  "9_to_10": "rarely",
  "10_plus": "rarely",
};

interface SuccessData {
  id: string;
  editToken?: string;
}

interface RunFormProps {
  mode?: "create" | "edit";
  initialData?: RunFormInitialData;
  runId?: string;
  editToken?: string;
}

export const RunForm = ({
  mode = "create",
  initialData,
  runId,
  editToken,
}: RunFormProps) => {
  const [name, setName] = useState(initialData?.name ?? "");
  const [dayOfWeek, setDayOfWeek] = useState<string>(initialData?.dayOfWeek ?? "");
  const [startTime, setStartTime] = useState(initialData?.startTime ?? "");
  const [locationName, setLocationName] = useState(initialData?.locationName ?? "");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initialData ? { lat: initialData.latitude, lng: initialData.longitude } : null
  );
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(
    initialData ? { lat: initialData.latitude, lng: initialData.longitude } : null
  );
  const [typicalDistances, setTypicalDistances] = useState(initialData?.typicalDistances ?? "");
  const [terrain, setTerrain] = useState<string>(initialData?.terrain ?? "");
  const [paceGroups, setPaceGroups] = useState<PaceGroupInput>(
    initialData?.paceGroups ?? DEFAULT_PACE_GROUPS
  );
  const [contactName, setContactName] = useState(initialData?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(initialData?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(initialData?.contactPhone ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const [addressQuery, setAddressQuery] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [copied, setCopied] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const handleGeocode = async () => {
    if (!addressQuery.trim()) return;

    setIsGeocoding(true);
    setGeocodeResults([]);

    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(addressQuery.trim())}`
      );
      const json = await res.json();
      if (json.data) {
        setGeocodeResults(json.data);
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleGeocodeResultClick = (result: GeocodeResult) => {
    const coords = { lat: result.lat, lng: result.lng };
    setPin(coords);
    setFlyTo(coords);
    setGeocodeResults([]);
    setAddressQuery(result.displayName.split(",")[0]);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setPin({ lat, lng });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    const formData = {
      name: name.trim(),
      dayOfWeek,
      startTime,
      locationName: locationName.trim(),
      latitude: pin?.lat ?? 0,
      longitude: pin?.lng ?? 0,
      typicalDistances: typicalDistances.trim(),
      terrain,
      paceGroups,
      contactName: contactName.trim() || null,
      contactEmail: contactEmail.trim() || null,
      contactPhone: contactPhone.trim() || null,
      notes: notes.trim() || null,
    };

    const parsed = createRunSchema.safeParse(formData);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!errors[path]) {
          errors[path] = issue.message;
        }
      }

      if (!pin) {
        errors.latitude = "Pin a location on the map";
      }

      setFieldErrors(errors);

      // Focus first invalid field
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey && formRef.current) {
        const el = formRef.current.querySelector<HTMLElement>(
          `[data-field="${firstErrorKey}"]`
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const url =
        mode === "edit"
          ? `/api/runs/${runId}?token=${editToken}`
          : "/api/runs";
      const method = mode === "edit" ? "PUT" : "POST";
      const body =
        mode === "edit" ? { ...parsed.data, isActive } : parsed.data;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setServerError(
            "Your edit link is invalid or has expired. If you've lost your link, contact the site admin."
          );
        } else {
          setServerError(json.error || "Something went wrong. Please try again.");
        }
        return;
      }

      if (mode === "edit") {
        setSuccess({ id: runId! });
      } else {
        setSuccess({
          id: json.data.id,
          editToken: json.data.editToken,
        });
      }
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create mode success: show edit link
  if (success && success.editToken) {
    const editUrl = `${window.location.origin}/runs/${success.id}/edit?token=${success.editToken}`;

    const handleCopy = async () => {
      await navigator.clipboard.writeText(editUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="mt-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-brand-navy">
            Your run has been added!
          </h2>
          <p className="mt-2 text-gray-600">
            Save the link below to edit or remove your run later.
          </p>
        </div>

        <div className="rounded-lg border-2 border-brand-purple bg-purple-50 p-4">
          <p className="mb-2 text-sm font-semibold text-brand-purple">
            Your secret edit link
          </p>
          <p className="break-all font-mono text-sm text-gray-800">{editUrl}</p>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-3 w-full rounded-md bg-brand-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <p className="mt-3 text-xs text-gray-600">
            Save this link — it&apos;s the only way to edit or remove your run.
          </p>
        </div>

        <a
          href={`mailto:?subject=${encodeURIComponent("My MCRRC Run Finder edit link")}&body=${encodeURIComponent(`Here's your secret edit link for your run on MCRRC Run Finder:\n\n${editUrl}\n\nSave this link — it's the only way to edit or remove your run.`)}`}
          className="block w-full rounded-md border border-brand-purple px-4 py-2 text-center text-sm font-medium text-brand-purple transition-colors hover:bg-purple-50"
        >
          Email this link to myself
        </a>

        <div className="flex gap-3">
          <Link
            href={`/runs/${success.id}`}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            View your run
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Back to map
          </Link>
        </div>
      </div>
    );
  }

  // Edit mode success: simple confirmation
  if (success && mode === "edit") {
    return (
      <div className="mt-6 space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-brand-navy">
            Run updated!
          </h2>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/runs/${success.id}`}
            className="flex-1 rounded-md bg-brand-purple px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            View your run
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Back to map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-5">
      {/* Active/Inactive Toggle (edit mode only) */}
      {mode === "edit" && (
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Run Status</p>
              <p className="text-xs text-gray-500">
                {isActive
                  ? "This run is visible on the map."
                  : "This run is hidden from the map."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isActive ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {!isActive && (
            <div className="mt-2 rounded-md bg-yellow-50 px-3 py-2">
              <p className="text-xs text-yellow-800">
                Runners will not be able to find this run while it is inactive.
              </p>
            </div>
          )}
        </div>
      )}

      {serverError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Run Name */}
      <div data-field="name">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Run Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g., "Bethesda Tuesday Track"'
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
        />
        {fieldErrors.name && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
        )}
      </div>

      {/* Day of Week */}
      <div data-field="dayOfWeek">
        <label className="block text-sm font-medium text-gray-700">
          Day of Week *
        </label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setDayOfWeek(day)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                dayOfWeek === day
                  ? "bg-brand-purple text-white"
                  : "bg-brand-gray text-gray-600 hover:bg-gray-200"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        {fieldErrors.dayOfWeek && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.dayOfWeek}</p>
        )}
      </div>

      {/* Start Time */}
      <div data-field="startTime">
        <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
          Start Time *
        </label>
        <input
          id="startTime"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
        />
        {fieldErrors.startTime && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.startTime}</p>
        )}
      </div>

      {/* Meeting Location */}
      <div data-field="locationName">
        <label
          htmlFor="locationName"
          className="block text-sm font-medium text-gray-700"
        >
          Meeting Location *
        </label>
        <input
          id="locationName"
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder='e.g., "Bethesda Elementary parking lot"'
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
        />
        {fieldErrors.locationName && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.locationName}</p>
        )}
      </div>

      {/* Pin Location on Map */}
      <div data-field="latitude">
        <label className="block text-sm font-medium text-gray-700">
          Pin Location on Map *
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleGeocode();
              }
            }}
            placeholder="Search address..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
          />
          <button
            type="button"
            onClick={handleGeocode}
            disabled={isGeocoding}
            className="rounded-md bg-brand-purple px-3 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isGeocoding ? "..." : "Search"}
          </button>
        </div>

        {geocodeResults.length > 0 && (
          <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white">
            {geocodeResults.map((result, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleGeocodeResultClick(result)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-gray"
                >
                  {result.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2">
          <DynamicLocationPickerMap
            pin={pin}
            flyTo={flyTo}
            onLocationSelect={handleMapClick}
          />
        </div>

        {pin && (
          <p className="mt-1 text-xs text-gray-500">
            Pin: {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
          </p>
        )}

        {fieldErrors.latitude && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.latitude}</p>
        )}
      </div>

      {/* Typical Distances */}
      <div data-field="typicalDistances">
        <label
          htmlFor="typicalDistances"
          className="block text-sm font-medium text-gray-700"
        >
          Typical Distances *
        </label>
        <input
          id="typicalDistances"
          type="text"
          value={typicalDistances}
          onChange={(e) => setTypicalDistances(e.target.value)}
          placeholder='e.g., "4 or 6 miles"'
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
        />
        {fieldErrors.typicalDistances && (
          <p className="mt-1 text-xs text-red-600">
            {fieldErrors.typicalDistances}
          </p>
        )}
      </div>

      {/* Terrain */}
      <div data-field="terrain">
        <label className="block text-sm font-medium text-gray-700">
          Terrain *
        </label>
        <div className="mt-1 flex gap-2">
          {TERRAIN_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTerrain(option)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                terrain === option
                  ? "bg-brand-purple text-white"
                  : "bg-brand-gray text-gray-600 hover:bg-gray-200"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {fieldErrors.terrain && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.terrain}</p>
        )}
      </div>

      {/* Pace Availability */}
      <div data-field="paceGroups">
        <label className="block text-sm font-medium text-gray-700">
          Pace Availability *
        </label>
        <p className="mt-0.5 text-xs text-gray-500">
          How often does each pace range show up at this run?
        </p>
        <div className="mt-2">
          <PaceGroupSelector
            value={paceGroups}
            onChange={setPaceGroups}
            errors={
              Object.keys(fieldErrors).some((k) => k.startsWith("paceGroups"))
                ? Object.fromEntries(
                    Object.entries(fieldErrors)
                      .filter(([k]) => k.startsWith("paceGroups."))
                      .map(([k, v]) => [k.replace("paceGroups.", ""), v])
                  )
                : undefined
            }
          />
        </div>
      </div>

      {/* Contact Name */}
      <div data-field="contactName">
        <label
          htmlFor="contactName"
          className="block text-sm font-medium text-gray-700"
        >
          Contact Name
        </label>
        <input
          id="contactName"
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
        />
      </div>

      {/* Contact Email */}
      <div data-field="contactEmail">
        <label
          htmlFor="contactEmail"
          className="block text-sm font-medium text-gray-700"
        >
          Contact Email
        </label>
        <input
          id="contactEmail"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
        />
        {fieldErrors.contactEmail && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.contactEmail}</p>
        )}
      </div>

      {/* Contact Phone */}
      <div data-field="contactPhone">
        <label
          htmlFor="contactPhone"
          className="block text-sm font-medium text-gray-700"
        >
          Contact Phone
        </label>
        <input
          id="contactPhone"
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
        />
      </div>

      {/* Notes */}
      <div data-field="notes">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder='e.g., "Coffee at Starbucks after. Bring headlamp Nov–Feb."'
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-brand-purple px-4 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {mode === "edit"
          ? isSubmitting
            ? "Saving..."
            : "Save Changes"
          : isSubmitting
            ? "Submitting..."
            : "Submit Run"}
      </button>
    </form>
  );
};
