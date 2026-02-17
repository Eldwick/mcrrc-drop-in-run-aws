import Link from "next/link";

export default function RunNotFound() {
  return (
    <main className="relative z-0 mx-auto max-w-lg px-4 py-6">
      <h1 className="text-xl font-bold text-brand-navy">Run Not Found</h1>
      <p className="mt-4 text-sm text-gray-600">
        This run could not be found. It may have been removed or deactivated.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block text-sm font-medium text-brand-purple hover:text-brand-orange"
      >
        &larr; Back to Map
      </Link>
    </main>
  );
}
