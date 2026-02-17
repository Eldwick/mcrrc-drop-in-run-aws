import { RunForm } from "@/components/forms/RunForm";

export default function AddRunPage() {
  return (
    <main className="relative z-0 mx-auto max-w-lg px-4 py-6">
      <h1 className="text-xl font-bold text-brand-navy">Add a Run</h1>
      <RunForm />
    </main>
  );
}
