import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm text-amber-700 shadow-sm">
          DearMind MVP
        </div>

        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
          A monthly letter your parent will read again and again.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          DearMind turns weekly guided phone conversations into warm handwritten-style
          letters, family summaries, and preserved memories.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/intake"
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
          >
            Join the founding family pilot
          </Link>

          <Link
            href="/admin"
            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Admin dashboard
          </Link>
        </div>

        <div className="mt-16 grid max-w-4xl gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 text-left shadow-sm">
            <h2 className="text-lg font-semibold">We call</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A warm weekly conversation helps capture stories, routines, and family memories.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 text-left shadow-sm">
            <h2 className="text-lg font-semibold">We write</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Each month, DearMind creates a personal letter based on real conversations.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 text-left shadow-sm">
            <h2 className="text-lg font-semibold">We preserve</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Families receive summaries and can build an annual memory keepsake.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}