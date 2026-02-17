"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RunForm } from "@/components/forms/RunForm";
import type { RunFormInitialData, PaceGroupInput } from "@/lib/types/run";

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: RunFormInitialData };

export default function EditRunPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const rawId = params.id;
  const numId = useMemo(
    () => (typeof rawId === "string" ? parseInt(rawId, 10) : NaN),
    [rawId]
  );

  const validationError = !token
    ? "You need an edit link to modify this run. If you've lost your link, contact the site admin."
    : isNaN(numId)
      ? "Invalid run ID."
      : null;

  const [fetchState, setFetchState] = useState<FetchState>({ status: "loading" });

  const handleFetchError = useCallback((message: string) => {
    setFetchState({ status: "error", message });
  }, []);

  const handleFetchSuccess = useCallback((data: RunFormInitialData) => {
    setFetchState({ status: "ready", data });
  }, []);

  useEffect(() => {
    if (validationError || !token) return;

    let cancelled = false;

    const fetchRun = async () => {
      try {
        const res = await fetch(`/api/runs/${numId}?token=${token}`);

        if (cancelled) return;

        if (res.status === 404) {
          handleFetchError("This run could not be found.");
          return;
        }

        if (!res.ok) {
          const json = await res.json();
          handleFetchError(
            json.error || "Something went wrong loading this run."
          );
          return;
        }

        const json = await res.json();
        const run = json.data;

        handleFetchSuccess({
          name: run.name,
          dayOfWeek: run.dayOfWeek,
          startTime: run.startTime,
          locationName: run.locationName,
          latitude: run.latitude,
          longitude: run.longitude,
          typicalDistances: run.typicalDistances,
          terrain: run.terrain,
          paceGroups: run.paceGroups as PaceGroupInput,
          contactName: run.contactName,
          contactEmail: run.contactEmail,
          contactPhone: run.contactPhone,
          notes: run.notes,
          isActive: run.isActive,
        });
      } catch {
        if (!cancelled) {
          handleFetchError(
            "Network error. Please check your connection and try again."
          );
        }
      }
    };

    fetchRun();

    return () => {
      cancelled = true;
    };
  }, [numId, token, validationError, handleFetchError, handleFetchSuccess]);

  // Render validation errors (no effect needed)
  if (validationError) {
    return (
      <main className="relative z-0 mx-auto max-w-lg px-4 py-6">
        <h1 className="text-xl font-bold text-brand-navy">Edit Run</h1>
        <div className="mt-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{validationError}</p>
        </div>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-brand-purple hover:text-brand-orange"
        >
          Back to map
        </Link>
      </main>
    );
  }

  if (fetchState.status === "loading") {
    return (
      <main className="relative z-0 mx-auto max-w-lg px-4 py-6">
        <h1 className="text-xl font-bold text-brand-navy">Edit Run</h1>
        <div className="mt-8 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
          <span className="ml-3 text-sm text-gray-600">
            Loading run details...
          </span>
        </div>
      </main>
    );
  }

  if (fetchState.status === "error") {
    return (
      <main className="relative z-0 mx-auto max-w-lg px-4 py-6">
        <h1 className="text-xl font-bold text-brand-navy">Edit Run</h1>
        <div className="mt-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{fetchState.message}</p>
        </div>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-brand-purple hover:text-brand-orange"
        >
          Back to map
        </Link>
      </main>
    );
  }

  return (
    <main className="relative z-0 mx-auto max-w-lg px-4 py-6">
      <h1 className="text-xl font-bold text-brand-navy">Edit Run</h1>
      <RunForm
        mode="edit"
        initialData={fetchState.data}
        runId={numId}
        editToken={token!}
      />
    </main>
  );
}
