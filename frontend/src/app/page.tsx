// TODO: Fetch active runs from API Gateway (GET /runs) instead of empty array
import { SeekerView } from "@/components/SeekerView";
import type { RunResponse } from "@/lib/types/run";

export const dynamic = "force-dynamic";

export default async function Home() {
  const activeRuns: RunResponse[] = [];

  return (
    <main className="h-screen overflow-hidden">
      <SeekerView runs={activeRuns} />
    </main>
  );
}
