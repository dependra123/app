import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CloudSun, Download, Save } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumField } from "@/components/num-field";
import { CgChart } from "@/components/cg-chart";
import {
  listAircraft,
  listAirports,
  listFlights,
  saveFlight,
  fetchWeather,
} from "@/lib/api.functions";
import type { AircraftData } from "@/lib/aircraft-types";
import {
  checkStage,
  computePerf,
  computeWB,
  limitsAt,
  pressureAltitude,
  windComponents,
} from "@/lib/wb-calc";
import { buildReport } from "@/lib/wb-pdf";

type LegState = {
  icao: string;
  palt: number;
  temp: number;
  windDir: number;
  windSpeed: number;
  runwayHeading: number;
  grass: boolean;
  raw?: string;
  fetchedAt?: string;
  observedAt?: string;
};

type PlanState = {
  aircraftId: string;
  pilot: number;
  rear: number;
  bag1: number;
  bag2: number;
  fuelGal: number;
  burnGal: number;
  airTime: string;
  category: "Utility" | "Normal";
  flapSetting: string;
  pilotName: string;
  date: string;
  instructor: string;
  flightNumber: string;
  hobbsStart: string;
  hobbsStop: string;
  dep: LegState;
  dest: LegState;
};

const emptyLeg = (icao: string): LegState => ({
  icao,
  palt: 0,
  temp: 15,
  windDir: 0,
  windSpeed: 0,
  runwayHeading: 0,
  grass: false,
});

const initialPlan = (): PlanState => ({
  aircraftId: "",
  pilot: 170,
  rear: 0,
  bag1: 0,
  bag2: 0,
  fuelGal: 40,
  burnGal: 10,
  airTime: "",
  category: "Normal",
  flapSetting: "10°",
  pilotName: "",
  date: new Date().toISOString().slice(0, 10),
  instructor: "",
  flightNumber: "",
  hobbsStart: "",
  hobbsStop: "",
  dep: emptyLeg("CYBW"),
  dest: emptyLeg("CYBW"),
});

export const Route = createFileRoute("/_authenticated/plan")({
  validateSearch: (search: Record<string, unknown>) => ({
    flight: typeof search["flight"] === "string" ? (search["flight"] as string) : undefined,
  }),
  component: Planner,
});

function Card({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="num rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
          {step}
        </span>
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Planner() {
  const { flight: flightId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getAircraft = useServerFn(listAircraft);
  const getAirports = useServerFn(listAirports);
  const getFlights = useServerFn(listFlights);
  const persist = useServerFn(saveFlight);
  const weather = useServerFn(fetchWeather);

  const { data: aircraftList = [] } = useQuery({ queryKey: ["aircraft"], queryFn: () => getAircraft() });
  const { data: airports = [] } = useQuery({ queryKey: ["airports"], queryFn: () => getAirports() });
  const { data: flights = [] } = useQuery({ queryKey: ["flights"], queryFn: () => getFlights() });

  const [plan, setPlan] = useState<PlanState>(initialPlan);
  const [fuelUnit, setFuelUnit] = useState<"gal" | "lbs">("gal");
  const [loadedFlight, setLoadedFlight] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!plan.aircraftId && aircraftList.length) {
      setPlan((p) => ({ ...p, aircraftId: aircraftList[0]!.id }));
    }
  }, [aircraftList, plan.aircraftId]);

  useEffect(() => {
    if (!flightId || loadedFlight === flightId) return;
    const f = flights.find((x) => x.id === flightId);
    if (!f) return;
    setPlan({ ...initialPlan(), ...(f.data as unknown as PlanState) });
    setLoadedFlight(flightId);
  }, [flightId, flights, loadedFlight]);

  const aircraftRow = aircraftList.find((a) => a.id === plan.aircraftId);
  const data = aircraftRow ? (aircraftRow.data as unknown as AircraftData) : null;

  const set = (patch: Partial<PlanState>) => setPlan((p) => ({ ...p, ...patch }));
  const setLeg = (which: "dep" | "dest", patch: Partial<LegState>) =>
    setPlan((p) => ({ ...p, [which]: { ...p[which], ...patch } }));

  const wb = useMemo(
    () =>
      data
        ? computeWB(data, {
            pilot: plan.pilot,
            rear: plan.rear,
            bag1: plan.bag1,
            bag2: plan.bag2,
            fuelGal: plan.fuelGal,
            burnGal: plan.burnGal,
          })
        : null,
    [data, plan.pilot, plan.rear, plan.bag1, plan.bag2, plan.fuelGal, plan.burnGal],
  );

  const depWind = windComponents(plan.dep.runwayHeading, plan.dep.windDir, plan.dep.windSpeed);
  const destWind = windComponents(plan.dest.runwayHeading, plan.dest.windDir, plan.dest.windSpeed);

  const takeoffPerf =
    data && wb
      ? computePerf(data.takeoff, {
          weight: wb.takeoff.weight,
          palt: plan.dep.palt,
          temp: plan.dep.temp,
          headwind: depWind.headwind,
          grass: plan.dep.grass,
          wind: data.wind,
        })
      : null;
  const landingPerf =
    data && wb
      ? computePerf(data.landing, {
          weight: wb.landing.weight,
          palt: plan.dest.palt,
          temp: plan.dest.temp,
          headwind: destWind.headwind,
          grass: plan.dest.grass,
          wind: data.wind,
        })
      : null;

  const warnings: string[] = [];
  if (data && wb) {
    if (wb.ramp.weight > data.maxRamp) warnings.push(`Ramp weight ${Math.round(wb.ramp.weight)} lb exceeds max ramp ${data.maxRamp} lb`);
    if (wb.takeoff.weight > data.maxTakeoff) warnings.push(`Take-off weight ${Math.round(wb.takeoff.weight)} lb exceeds MTOW ${data.maxTakeoff} lb`);
    if (wb.landing.weight > data.maxLanding) warnings.push(`Landing weight ${Math.round(wb.landing.weight)} lb exceeds max landing ${data.maxLanding} lb`);
    if (plan.fuelGal > data.fuel.usableGal) warnings.push(`Fuel ${plan.fuelGal} gal exceeds usable ${data.fuel.usableGal} gal`);
    const stages = [
      ["Zero fuel", wb.zeroFuel],
      ["Take-off", wb.takeoff],
      ["Landing", wb.landing],
    ] as const;
    for (const [label, s] of stages) {
      const chk = checkStage(data, s);
      const ok = plan.category === "Utility" ? chk.inUtility : chk.inNormal;
      if (!ok) warnings.push(`${label} CG ${s.cg.toFixed(2)} in at ${Math.round(s.weight)} lb is outside the ${plan.category.toLowerCase()} category envelope`);
    }
  }
  const withinLimits = warnings.length === 0;

  const weatherMutation = useMutation({
    mutationFn: () => weather({ data: { icaos: [plan.dep.icao, plan.dest.icao] } }),
    onSuccess: (reports) => {
      let applied = 0;
      for (const which of ["dep", "dest"] as const) {
        const leg = plan[which];
        const r = reports.find((x) => x.icao === leg.icao.toUpperCase());
        if (!r || !r.ok) {
          toast.warning(r?.message ?? `No weather for ${leg.icao} — enter values manually.`);
          continue;
        }
        const stored = airports.find((a) => a.icao === leg.icao.toUpperCase());
        const elev = stored ? Number(stored.elevation_ft) : r.elevationFtReported;
        const patch: Partial<LegState> = { raw: r.raw ?? "" };
        patch.fetchedAt = new Date().toISOString();
        if (r.observedAt) patch.observedAt = r.observedAt;
        if (typeof r.tempC === "number") patch.temp = r.tempC;
        if (typeof r.windDir === "number") patch.windDir = r.windDir;
        if (typeof r.windSpeedKt === "number") patch.windSpeed = r.windSpeedKt;
        if (typeof elev === "number" && typeof r.altimInHg === "number") {
          patch.palt = pressureAltitude(elev, r.altimInHg);
        }
        setLeg(which, patch);
        applied++;
        if (!stored) {
          toast.info(`${leg.icao}: no saved field elevation — pressure altitude used the reported station elevation. Add it under Airports for accuracy.`);
        }
      }
      if (applied) toast.success("Weather applied");
    },
    onError: () => toast.error("Weather service unreachable — enter values manually."),
  });

  // Auto-fetch weather once for a brand-new (unsaved) W&B
  const autoFetched = useRef(false);
  useEffect(() => {
    if (flightId || autoFetched.current) return;
    if (!plan.dep.icao) return;
    autoFetched.current = true;
    weatherMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightId, plan.dep.icao]);

  const saveMutation = useMutation({
    mutationFn: () =>
      persist({
        data: {
          ...(flightId ? { id: flightId } : {}),
          aircraft_id: plan.aircraftId || null,
          title: `${aircraftRow?.tail_number ?? "Flight"} · ${plan.dep.icao} → ${plan.dest.icao}`,
          flight_date: plan.date,
          data: plan,
        },
      }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["flights"] });
      toast.success("Flight saved");
      if (row?.id && !flightId) navigate({ to: "/plan", search: { flight: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function downloadPdf() {
    if (!data || !wb || !aircraftRow) return;
    const doc = buildReport({
      tail: aircraftRow.tail_number,
      pilotName: plan.pilotName,
      date: plan.date,
      category: plan.category,
      withinLimits,
      aircraft: data,
      baseType: aircraftRow.base_type,
      wb,
      fuelGal: plan.fuelGal,
      burnGal: plan.burnGal,
      takeoff: {
        location: plan.dep.icao,
        palt: plan.dep.palt,
        headwind: depWind.headwind,
        crosswind: depWind.crosswind,
        roll: takeoffPerf?.roll ?? NaN,
        obs: takeoffPerf?.obs ?? NaN,
        grass: plan.dep.grass,
      },
      landing: {
        location: plan.dest.icao,
        palt: plan.dest.palt,
        headwind: destWind.headwind,
        crosswind: destWind.crosswind,
        roll: landingPerf?.roll ?? NaN,
        obs: landingPerf?.obs ?? NaN,
        grass: plan.dest.grass,
        ...(stallFor(plan.flapSetting) ? { vref: stallFor(plan.flapSetting)! } : {}),
      },
      notes: [
        takeoffPerf ? `Takeoff: ${takeoffPerf.steps.join(" → ")}` : "",
        landingPerf ? `Landing: ${landingPerf.steps.join(" → ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    doc.save(`WB-${aircraftRow.tail_number}-${plan.date}.pdf`);
  }

  function stallFor(flap: string) {
    if (!data) return undefined;
    const idx = data.stall.flaps.indexOf(flap);
    const row = data.stall.rows.find((r) => r.bank === 0);
    if (idx < 0 || !row) return undefined;
    return `${row.values[idx]} ${data.stall.unit}`;
  }

  const lpg = data?.fuel.lbsPerGal ?? 6;

  if (!aircraftList.length) {
    return (
      <div>
        <PageTitle title="Flight planner" />
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Add an aircraft first — the planner needs a profile to pull arms, limits and charts from.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Flight planner" subtitle="Aircraft → load → weather → results" />

      <Card step="1" title="Aircraft">
        <Select value={plan.aircraftId} onValueChange={(v) => set({ aircraftId: v })}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Select aircraft" />
          </SelectTrigger>
          <SelectContent>
            {aircraftList.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.tail_number} — 172{a.base_type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data ? (
          <p className="num mt-2 text-xs text-muted-foreground">
            Empty {data.emptyWeight} lb @ {data.emptyArm} in · MTOW {data.maxTakeoff} lb · usable fuel{" "}
            {data.fuel.usableGal} gal
          </p>
        ) : null}
      </Card>

      <Card step="2" title="People, baggage & fuel">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumField label="Pilot & front seat" suffix="lbs" value={plan.pilot} onChange={(v) => set({ pilot: v })} />
          <NumField label="Rear seat" suffix="lbs" value={plan.rear} onChange={(v) => set({ rear: v })} />
          <NumField label="Baggage area 1" suffix="lbs" value={plan.bag1} onChange={(v) => set({ bag1: v })} />
          <NumField label="Baggage area 2" suffix="lbs" value={plan.bag2} onChange={(v) => set({ bag2: v })} />
          <NumField
            label={`Fuel loaded`}
            suffix={fuelUnit}
            step={0.1}
            value={fuelUnit === "gal" ? plan.fuelGal : Math.round(plan.fuelGal * lpg)}
            onChange={(v) => set({ fuelGal: fuelUnit === "gal" ? v : v / lpg })}
          />
          <NumField
            label="Estimated fuel burn"
            suffix={fuelUnit}
            step={0.1}
            value={fuelUnit === "gal" ? plan.burnGal : Math.round(plan.burnGal * lpg)}
            onChange={(v) => set({ burnGal: fuelUnit === "gal" ? v : v / lpg })}
          />
          <div>
            <Label className="label-caps mb-1 block">Fuel units</Label>
            <div className="flex gap-1">
              {(["gal", "lbs"] as const).map((u) => (
                <Button key={u} size="sm" variant={fuelUnit === u ? "default" : "outline"} onClick={() => setFuelUnit(u)}>
                  {u}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="label-caps mb-1 block">Estimated air time</Label>
            <Input value={plan.airTime} placeholder="1.5 hr" onChange={(e) => set({ airTime: e.target.value })} />
          </div>
          <div>
            <Label className="label-caps mb-1 block">Category</Label>
            <Select value={plan.category} onValueChange={(v) => set({ category: v as "Utility" | "Normal" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Utility">Utility</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {wb && data ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="label-caps text-left">
                  <th className="py-1">Item</th>
                  <th className="text-right">Weight</th>
                  <th className="text-right">Arm</th>
                  <th className="text-right">Moment</th>
                </tr>
              </thead>
              <tbody className="num">
                {wb.rows.map((r) => (
                  <tr key={r.label} className="border-t border-border">
                    <td className="py-1 font-sans">{r.label}</td>
                    <td className="text-right">{r.weight.toFixed(0)}</td>
                    <td className="text-right">{r.arm.toFixed(1)}</td>
                    <td className="text-right">{r.moment.toFixed(0)}</td>
                  </tr>
                ))}
                <SummaryRow label="Zero Fuel Weight" s={wb.zeroFuel} />
                <tr className="border-t border-border">
                  <td className="py-1 font-sans">Fuel</td>
                  <td className="text-right">{wb.fuelLbs.toFixed(0)}</td>
                  <td className="text-right">{data.arms.fuel.toFixed(1)}</td>
                  <td className="text-right">{(wb.fuelLbs * data.arms.fuel).toFixed(0)}</td>
                </tr>
                <SummaryRow label="Ramp Weight" s={wb.ramp} />
                <tr className="border-t border-border">
                  <td className="py-1 font-sans">Less start &amp; taxi</td>
                  <td className="text-right">{data.startTaxi.weight}</td>
                  <td className="text-right">{data.arms.fuel.toFixed(1)}</td>
                  <td className="text-right">{data.startTaxi.moment}</td>
                </tr>
                <SummaryRow label="Take-Off Weight" s={wb.takeoff} />
                <tr className="border-t border-border">
                  <td className="py-1 font-sans">Fuel burn</td>
                  <td className="text-right">−{wb.burnLbs.toFixed(0)}</td>
                  <td className="text-right">{data.arms.fuel.toFixed(1)}</td>
                  <td className="text-right">−{(wb.burnLbs * data.arms.fuel).toFixed(0)}</td>
                </tr>
                <SummaryRow label="Landing Weight" s={wb.landing} />
              </tbody>
            </table>
          </div>
        ) : null}

        {warnings.length ? (
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="size-4" /> Out of limits
            </div>
            <ul className="mt-1 list-inside list-disc text-sm text-destructive">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : wb ? (
          <p className="mt-4 text-sm font-medium text-success">
            Within {plan.category.toLowerCase()} category weight and CG limits.
          </p>
        ) : null}
      </Card>

      {data && wb ? (
        <Card step="3" title="CG envelope">
          <CgChart
            normal={data.envelopeNormal}
            utility={data.envelopeUtility}
            points={[
              { label: "ZFW", cg: wb.zeroFuel.cg, weight: wb.zeroFuel.weight, color: "oklch(0.5 0.02 250)" },
              { label: "T/O", cg: wb.takeoff.cg, weight: wb.takeoff.weight, color: "oklch(0.65 0.17 45)" },
              { label: "LDG", cg: wb.landing.cg, weight: wb.landing.weight, color: "oklch(0.55 0.13 155)" },
            ]}
          />
          <ul className="num mt-3 space-y-1 text-sm">
            {(
              [
                ["Zero fuel", wb.zeroFuel],
                ["Take-off", wb.takeoff],
                ["Landing", wb.landing],
              ] as const
            ).map(([label, s]) => {
              const chk = checkStage(data, s);
              const lim = limitsAt(data.envelopeNormal, s.weight);
              const zone = chk.inUtility ? "Utility + Normal" : chk.inNormal ? "Normal" : "OUT OF LIMITS";
              return (
                <li key={label} className={chk.inNormal ? "" : "text-destructive"}>
                  <span className="font-sans">{label}:</span> {s.weight.toFixed(0)} lb @ {s.cg.toFixed(2)} in — {zone}
                  {lim ? ` (limits ${lim.fwd.toFixed(1)}–${lim.aft.toFixed(1)} in)` : ""}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card step="4" title="Departure & arrival weather">
        <div className="grid gap-5 md:grid-cols-2">
          {(["dep", "dest"] as const).map((which) => {
            const leg = plan[which];
            const comp = which === "dep" ? depWind : destWind;
            return (
              <div key={which} className="space-y-3">
                <div>
                  <Label className="label-caps mb-1 block">
                    {which === "dep" ? "Departure" : "Destination"} airport
                  </Label>
                  <Input
                    className="num uppercase"
                    value={leg.icao}
                    maxLength={4}
                    onChange={(e) => setLeg(which, { icao: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Pressure altitude" suffix="ft" value={leg.palt} onChange={(v) => setLeg(which, { palt: v })} />
                  <NumField label="Temperature" suffix="°C" value={leg.temp} onChange={(v) => setLeg(which, { temp: v })} />
                  <NumField label="Wind direction" suffix="°T" value={leg.windDir} onChange={(v) => setLeg(which, { windDir: v })} />
                  <NumField label="Wind speed" suffix="kt" value={leg.windSpeed} onChange={(v) => setLeg(which, { windSpeed: v })} />
                  <NumField label="Runway heading" suffix="°" value={leg.runwayHeading} onChange={(v) => setLeg(which, { runwayHeading: v })} />
                  <div className="flex items-end gap-2 pb-2">
                    <Checkbox
                      id={`grass-${which}`}
                      checked={leg.grass}
                      onCheckedChange={(c) => setLeg(which, { grass: c === true })}
                    />
                    <Label htmlFor={`grass-${which}`} className="text-sm">
                      Dry grass
                    </Label>
                  </div>
                </div>
                <p className="num text-sm">
                  {comp.headwind >= 0 ? "Headwind" : "Tailwind"} {Math.abs(comp.headwind).toFixed(0)} kt · crosswind{" "}
                  {comp.crosswind.toFixed(0)} kt from the {comp.crosswindFrom}
                </p>
                {leg.raw ? <p className="num text-xs text-muted-foreground">{leg.raw}</p> : null}
                {leg.fetchedAt ? (
                  <p className="num text-xs text-muted-foreground">
                    Fetched {new Date(leg.fetchedAt).toLocaleString()}
                    {leg.observedAt
                      ? ` · observed ${new Date(leg.observedAt).toISOString().slice(11, 16)}Z`
                      : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => weatherMutation.mutate()}
          disabled={weatherMutation.isPending}
        >
          <CloudSun className="size-4" />
          {weatherMutation.isPending ? "Fetching…" : "Fetch current weather"}
        </Button>
      </Card>

      <Card step="5" title="Performance">
        <div className="grid gap-5 md:grid-cols-2">
          {(
            [
              ["Takeoff", takeoffPerf],
              ["Landing", landingPerf],
            ] as const
          ).map(([label, perf]) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider">{label}</h3>
              {perf ? (
                <>
                  <div className="num mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <div className="label-caps">Ground roll</div>
                      <div className="text-xl font-semibold">{Math.round(perf.roll)} ft</div>
                      <div className="text-xs text-muted-foreground">chart {Math.round(perf.baseRoll)} ft</div>
                    </div>
                    <div>
                      <div className="label-caps">Over 50 ft</div>
                      <div className="text-xl font-semibold">{Math.round(perf.obs)} ft</div>
                      <div className="text-xs text-muted-foreground">chart {Math.round(perf.baseObs)} ft</div>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                    {perf.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs italic text-muted-foreground">{perf.conditions}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No chart data on this aircraft profile.</p>
              )}
            </div>
          ))}
        </div>

        {data ? (
          <div className="mt-5">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="label-caps mb-1 block">Planned flap setting</Label>
                <Select value={plan.flapSetting} onValueChange={(v) => set({ flapSetting: v })}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.stall.flaps.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="num text-sm text-muted-foreground">
                Stall speeds ({data.stall.unit}, flaps {plan.flapSetting}):{" "}
                {data.stall.rows
                  .map((r) => `${r.bank}° ${r.values[Math.max(0, data.stall.flaps.indexOf(plan.flapSetting))] ?? "—"}`)
                  .join(" · ")}
              </p>
            </div>
          </div>
        ) : null}
      </Card>

      <Card step="6" title="Trip sheet (optional)">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="label-caps mb-1 block">Pilot</Label>
            <Input value={plan.pilotName} onChange={(e) => set({ pilotName: e.target.value })} />
          </div>
          <div>
            <Label className="label-caps mb-1 block">Instructor / partner</Label>
            <Input value={plan.instructor} onChange={(e) => set({ instructor: e.target.value })} />
          </div>
          <div>
            <Label className="label-caps mb-1 block">Date</Label>
            <Input type="date" value={plan.date} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div>
            <Label className="label-caps mb-1 block">Flight #</Label>
            <Input value={plan.flightNumber} onChange={(e) => set({ flightNumber: e.target.value })} />
          </div>
          <div>
            <Label className="label-caps mb-1 block">Hobbs start</Label>
            <Input className="num" value={plan.hobbsStart} onChange={(e) => set({ hobbsStart: e.target.value })} />
          </div>
          <div>
            <Label className="label-caps mb-1 block">Hobbs stop</Label>
            <Input className="num" value={plan.hobbsStop} onChange={(e) => set({ hobbsStop: e.target.value })} />
          </div>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button onClick={downloadPdf} disabled={!wb}>
          <Download className="size-4" /> Download PDF
        </Button>
        <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="size-4" /> {flightId ? "Update flight" : "Save flight"}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, s }: { label: string; s: { weight: number; cg: number; moment: number } }) {
  return (
    <tr className="border-t border-border bg-secondary/60 font-semibold">
      <td className="py-1 font-sans">{label}</td>
      <td className="text-right">{s.weight.toFixed(0)}</td>
      <td className="text-right">{s.cg.toFixed(2)}</td>
      <td className="text-right">{s.moment.toFixed(0)}</td>
    </tr>
  );
}