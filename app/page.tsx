import { createLeague } from "@/lib/actions/league";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Chaos League</h1>
        <p className="text-sm text-neutral-600">
          Kahoot-style March Madness draft game.
        </p>
      </div>

      <form action={createLeague} className="space-y-3 rounded-xl border p-4">
        <label className="block text-sm font-medium">Create a league</label>
        <input
          name="name"
          placeholder="e.g., WhatsApp Crew 2026"
          className="w-full rounded-lg border px-3 py-2"
        />
        <button className="w-full rounded-lg bg-black px-4 py-2 text-white">
          Create League
        </button>
      </form>

      <a href="/join" className="rounded-lg border px-4 py-2 text-center">
        Join with Game PIN
      </a>
    </main>
  );
}