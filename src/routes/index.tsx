import { createFileRoute, Link } from "@tanstack/react-router";
import { Plane, Gauge, FileDown, CloudSun } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "C172 W&B — Cessna 172R/S Weight, Balance & Performance" },
      {
        name: "description",
        content:
          "Preflight weight and balance, CG envelope and takeoff/landing performance for the Cessna 172R and 172S, with a downloadable W&B report.",
      },
      { property: "og:title", content: "C172 W&B — Weight, Balance & Performance" },
      {
        property: "og:description",
        content:
          "Preflight weight and balance, CG envelope and takeoff/landing performance for the Cessna 172R and 172S.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Gauge, title: "Weight & balance", text: "Live ZFW, ramp, take-off and landing weights with CG at every stage." },
  { icon: Plane, title: "Your aircraft", text: "Clone the 172R or 172S template, then tune arms, charts and limits per tail number." },
  { icon: CloudSun, title: "Live METAR", text: "Pull wind, temperature and altimeter for departure and arrival, or type it in." },
  { icon: FileDown, title: "Printable report", text: "Download the completed W&B report with the CG graph and performance boxes." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-4">
          <Plane className="size-5 text-accent" />
          <span className="font-display text-base font-semibold tracking-wide">C172 W&amp;B</span>
          <Link to="/auth" className="ml-auto">
            <Button size="sm" variant="secondary">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <p className="label-caps">Cessna 172R / 172S</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          Weight, balance and performance — finished before you reach the ramp.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Enter people, fuel and weather. Get moments, CG envelope, interpolated takeoff and
          landing distances, and a report you can hand to your instructor.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/auth">
            <Button size="lg">Get started</Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">
              I already have an account
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <f.icon className="size-5 text-accent" />
              <h2 className="mt-3 text-lg font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          Planning tool only. Always verify every figure against the aircraft POH and the
          actual weight and balance sheet for your aircraft.
        </p>
      </section>
    </div>
  );
}
