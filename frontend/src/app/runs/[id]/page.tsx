import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
import type { PaceGroupInput, PaceRange } from "@/lib/types/run";
import type { AvailabilityLevel } from "@/lib/utils/scoring";
import { DynamicDetailMap } from "@/components/map/DynamicDetailMap";

const paceKeys: PaceRange[] = ["sub_8", "8_to_9", "9_to_10", "10_plus"];

const PACE_DISPLAY_LABELS: Record<PaceRange, string> = {
  sub_8: "< 8:00/mi",
  "8_to_9": "8:00\u20139:00/mi",
  "9_to_10": "9:00\u201310:00/mi",
  "10_plus": "10:00+/mi",
};

const availabilityStyles: Record<
  AvailabilityLevel,
  { dot: string; text: string; label: string }
> = {
  consistently: {
    dot: "bg-green-500",
    text: "text-green-700",
    label: "Consistently",
  },
  frequently: {
    dot: "bg-blue-500",
    text: "text-blue-700",
    label: "Frequently",
  },
  sometimes: {
    dot: "bg-yellow-500",
    text: "text-yellow-700",
    label: "Sometimes",
  },
  rarely: { dot: "bg-gray-400", text: "text-gray-500", label: "Rarely" },
};

interface RunDetailRow {
  name: string;
  dayOfWeek: string;
  startTime: string;
  locationName: string;
  latitude: number;
  longitude: number;
  typicalDistances: string;
  terrain: string;
  paceGroups: PaceGroupInput;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
}

// TODO: Fetch run from API Gateway (GET /runs/{id})
// Replace this stub with an actual API call once the backend is connected.
async function fetchRun(_id: string): Promise<RunDetailRow | null> {
  return null;
}

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { id } = await params;

  const row = await fetchRun(id);

  if (!row) {
    notFound();
  }

  const latitude = row.latitude;
  const longitude = row.longitude;
  const paceGroups = row.paceGroups;
  const hasContact = row.contactName || row.contactEmail || row.contactPhone;

  return (
    <main className="relative z-0 mx-auto max-w-lg px-4 pb-6 pt-4">
      {/* Map */}
      <div className="h-[200px] w-full overflow-hidden rounded-lg">
        <DynamicDetailMap latitude={latitude} longitude={longitude} />
      </div>

      {/* Run info */}
      <h1 className="mt-4 text-2xl font-bold text-brand-navy">{row.name}</h1>

      <div className="mt-3 space-y-1.5 text-sm text-gray-600">
        <p>
          <span className="mr-2" aria-hidden="true">
            &#128197;
          </span>
          {row.dayOfWeek}s at {row.startTime}
        </p>
        <p>
          <span className="mr-2" aria-hidden="true">
            &#128205;
          </span>
          {row.locationName}
        </p>
        <p>
          <span className="mr-2" aria-hidden="true">
            &#127939;
          </span>
          {row.typicalDistances} &middot; {row.terrain}
        </p>
      </div>

      {/* Pace groups */}
      <section className="mt-5">
        <h2 className="text-sm font-semibold text-brand-navy">Pace Groups</h2>
        <p className="mt-1 text-xs text-gray-500">How often each pace group shows up</p>
        <div className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {paceKeys.map((key) => {
            const level = paceGroups[key] as AvailabilityLevel;
            const style = availabilityStyles[level];
            return (
              <div
                key={key}
                className="flex items-center justify-between px-3 py-2.5"
              >
                <span className="text-sm text-gray-700">
                  {PACE_DISPLAY_LABELS[key]}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot}`}
                    aria-hidden="true"
                  />
                  <span className={`text-sm font-medium ${style.text}`}>
                    {style.label}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact info */}
      {hasContact && (
        <section className="mt-5">
          <h2 className="text-sm font-semibold text-brand-navy">Contact</h2>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {row.contactName && <p>{row.contactName}</p>}
            {row.contactEmail && (
              <p>
                <a
                  href={`mailto:${row.contactEmail}`}
                  className="text-brand-purple hover:text-brand-orange hover:underline"
                >
                  {row.contactEmail}
                </a>
              </p>
            )}
            {row.contactPhone && <p>{row.contactPhone}</p>}
          </div>
        </section>
      )}

      {/* Notes */}
      {row.notes && (
        <section className="mt-5">
          <h2 className="text-sm font-semibold text-brand-navy">Notes</h2>
          <p className="mt-2 text-sm text-gray-600">{row.notes}</p>
        </section>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-lg bg-brand-purple py-3 text-center text-sm font-semibold text-white hover:bg-brand-orange"
        >
          Get Directions
        </a>
        <Link
          href="/"
          className="block text-center text-sm font-medium text-brand-purple hover:text-brand-orange"
        >
          &larr; Back to Map
        </Link>
      </div>
    </main>
  );
}
