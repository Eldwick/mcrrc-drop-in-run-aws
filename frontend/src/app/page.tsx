import { SeekerView } from "@/components/SeekerView";
import type { RunResponse } from "@/lib/types/run";

export const dynamic = "force-dynamic";

async function fetchActiveRuns(): Promise<RunResponse[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];

  try {
    const res = await fetch(`${apiUrl}/runs`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const activeRuns = await fetchActiveRuns();

  return (
    <main className="h-screen overflow-hidden">
      <SeekerView runs={activeRuns} />
    </main>
  );
}
