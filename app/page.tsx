import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fffaf5] text-slate-900">
      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-16 text-center md:pt-24">
        <div className="mb-6 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 shadow-sm">
          DearMind Founding Family Pilot
        </div>

        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
          A monthly handwritten-style letter your parent can hold, keep, and
          reread.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          DearMind helps busy families stay emotionally connected with parents
          through guided weekly phone conversations, reviewed memory summaries,
          and warm monthly letters.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/intake"
            className="rounded-2xl bg-slate-900 px-7 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
          >
            Join the founding family pilot
          </Link>

          <Link
            href="#how-it-works"
            className="rounded-2xl border border-slate-300 bg-white px-7 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
          >
            See how it works
          </Link>
        </div>

        <p className="mt-5 text-sm text-slate-500">
          Built for adult children who want their parents to feel remembered,
          valued, and connected.
        </p>
      </section>

      {/* Problem */}
      <section className="border-y border-amber-100 bg-white/70 px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Why DearMind
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Families want to stay close, but life gets busy.
            </h2>
          </div>

          <div className="space-y-4 text-base leading-8 text-slate-600">
            <p>
              Many adult children care deeply about their parents, but calls can
              become rushed, repetitive, or easy to postpone. At the same time,
              parents carry stories, routines, memories, and small daily moments
              that families may never fully capture.
            </p>

            <p>
              DearMind creates a simple monthly rhythm: a gentle call, a
              reviewed memory summary, and a physical letter that turns everyday
              conversation into something lasting.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            How it works
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Four simple steps each month.
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600">
            DearMind is designed to feel warm, structured, and respectful. Every
            letter and family summary is reviewed before it is used.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-4">
          <FeatureCard
            number="1"
            title="We call"
            description="A guided weekly phone call asks gentle questions about daily life, family memories, and moments worth preserving."
          />

          <FeatureCard
            number="2"
            title="We listen"
            description="The conversation is summarized into respectful memory notes for review. Sensitive topics are handled carefully."
          />

          <FeatureCard
            number="3"
            title="We write"
            description="Each month, DearMind creates a warm letter based on reviewed memories and real details from the conversations."
          />

          <FeatureCard
            number="4"
            title="We share"
            description="The parent receives a handwritten-style letter, and the family subscriber receives a concise monthly update."
          />
        </div>
      </section>

      {/* Outputs */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              What families receive
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              A service built around memory, connection, and trust.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <OutputCard
              title="Monthly parent letter"
              description="A warm handwritten-style letter that your parent can hold, keep, reread, and share."
            />

            <OutputCard
              title="Family monthly summary"
              description="A short reviewed update for the adult child, focused on memories, connection points, and themes from the month."
            />

            <OutputCard
              title="Memory archive"
              description="Reviewed stories and highlights can later become an annual diary, family keepsake, or memory treasure box."
            />
          </div>
        </div>
      </section>

      {/* Call themes */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Monthly rhythm
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Each weekly call has a clear purpose.
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              The guided structure keeps conversations simple, respectful, and
              meaningful without feeling intrusive.
            </p>
          </div>

          <div className="grid gap-4">
            <ThemeRow
              week="Week 1"
              title="Present life and daily activities"
              description="Small joys, routines, meals, calls, visits, and moments from the current week."
            />

            <ThemeRow
              week="Week 2"
              title="Family connection"
              description="People they are thinking about, family stories, messages, and intergenerational memories."
            />

            <ThemeRow
              week="Week 3"
              title="Life memory"
              description="Childhood, school, work, places, recipes, friendships, migration, marriage, or lessons learned."
            />

            <ThemeRow
              week="Week 4"
              title="Monthly letter preparation"
              description="The memories, people, routines, and reflections they want included in that month’s letter."
            />
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="bg-slate-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">
              Privacy and consent
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              DearMind is a memory service, not a medical or monitoring service.
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-300">
              We keep the service focused on family memory, daily life, and
              connection. Parent consent is required before regular calls begin,
              and outputs are reviewed before use.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <TrustCard
              title="Consent first"
              description="The parent should know what DearMind is, why calls are happening, and what may be shared."
            />

            <TrustCard
              title="Human-reviewed"
              description="Letters and summaries are reviewed before they are printed, mailed, or sent to family."
            />

            <TrustCard
              title="Sensitive topics avoided"
              description="DearMind is not for medical, legal, financial, political, emergency, or highly private information."
            />
          </div>
        </div>
      </section>

      {/* Pilot */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm md:p-12">
          <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                Founding family pilot
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                We’re accepting a small number of pilot families.
              </h2>

              <p className="mt-4 text-base leading-7 text-slate-600">
                The pilot helps us refine the call experience, letter quality,
                privacy workflow, and family summary format before a wider
                launch.
              </p>
            </div>

            <div className="rounded-3xl bg-[#fffaf5] p-6">
              <h3 className="text-lg font-semibold">Pilot includes</h3>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>• Guided weekly phone conversations</li>
                <li>• AI-assisted but human-reviewed memory notes</li>
                <li>• Monthly handwritten-style parent letter</li>
                <li>• Family-facing monthly summary</li>
                <li>• Feedback call to improve the service</li>
              </ul>

              <Link
                href="/intake"
                className="mt-6 inline-flex w-full justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
              >
                Join the pilot
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            FAQ
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Questions families usually ask.
          </h2>

          <div className="mt-8 space-y-4">
            <FAQ
              question="Is DearMind replacing my calls with my parent?"
              answer="No. DearMind is meant to support family connection, not replace it. The service creates a gentle structure for preserving memories and giving families something meaningful to hold onto."
            />

            <FAQ
              question="Will my parent know the call is recorded or summarized?"
              answer="Yes. Parent consent is part of the workflow. The service should be explained clearly before regular calls begin."
            />

            <FAQ
              question="What information is shared with family?"
              answer="The family summary focuses on safe, respectful memory highlights and general connection themes. Sensitive details are avoided or flagged for review."
            />

            <FAQ
              question="Is this medical care or elder monitoring?"
              answer="No. DearMind is not a medical, emergency, legal, financial, therapy, or monitoring service. It is a family memory and connection service."
            />

            <FAQ
              question="Can we stop anytime?"
              answer="Yes. A family or parent can pause or stop the service. The pilot is designed to learn what feels helpful, comfortable, and meaningful."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Help your parent feel remembered.
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600">
            Start with the founding family pilot and help shape DearMind before
            the public launch.
          </p>

          <Link
            href="/intake"
            className="mt-8 inline-flex rounded-2xl bg-slate-900 px-7 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
          >
            Join the founding family pilot
          </Link>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
        {number}
      </div>

      <h3 className="mt-5 text-lg font-semibold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function OutputCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function ThemeRow({
  week,
  title,
  description,
}: {
  week: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">{week}</p>
          <h3 className="mt-1 text-lg font-semibold">{title}</h3>
        </div>

        <p className="max-w-xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>
    </div>
  );
}

function TrustCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-800 p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 p-6">
      <h3 className="text-base font-semibold">{question}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
    </div>
  );
}