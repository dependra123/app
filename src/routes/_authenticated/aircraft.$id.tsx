import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumField, CellInput } from "@/components/num-field";
import { PerfTableEditor } from "@/components/perf-table-editor";
import { CgChart } from "@/components/cg-chart";
import { listAircraft, saveAircraft } from "@/lib/api.functions";
import type { AircraftData, EnvelopePoint } from "@/lib/aircraft-types";

export const Route = createFileRoute("/_authenticated/aircraft/$id")({
  component: AircraftEditor,
});

function AircraftEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAircraft);
  const save = useServerFn(saveAircraft);

  const { data: all = [], isLoading } = useQuery({ queryKey: ["aircraft"], queryFn: () => fetchAll() });
  const row = all.find((a) => a.id === id);

  const [tail, setTail] = useState("");
  const [name, setName] = useState("");
  const [data, setData] = useState<AircraftData | null>(null);

  useEffect(() => {
    if (!row) return;
    setTail(row.tail_number);
    setName(row.name ?? "");
    setData(structuredClone(row.data as unknown as AircraftData));
  }, [row]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id,
          tail_number: tail.toUpperCase(),
          name: name || null,
          base_type: row?.base_type ?? "R",
          data,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aircraft"] });
      toast.success("Aircraft saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!row) return <p className="text-sm text-muted-foreground">Aircraft not found.</p>;

  const set = (patch: Partial<AircraftData>) => setData({ ...data, ...patch });

  const envEditor = (key: "envelopeNormal" | "envelopeUtility", label: string) => {
    const pts = data[key];
    const upd = (next: EnvelopePoint[]) => set({ [key]: next } as Partial<AircraftData>);
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider">{label}</h3>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="label-caps text-left">
              <th className="py-1">Weight</th>
              <th>Fwd limit</th>
              <th>Aft limit</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pts.map((p, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1">
                  <CellInput value={p.weight} onChange={(v) => upd(pts.map((q, k) => (k === i ? { ...q, weight: v } : q)))} />
                </td>
                <td>
                  <CellInput value={p.fwd} onChange={(v) => upd(pts.map((q, k) => (k === i ? { ...q, fwd: v } : q)))} />
                </td>
                <td>
                  <CellInput value={p.aft} onChange={(v) => upd(pts.map((q, k) => (k === i ? { ...q, aft: v } : q)))} />
                </td>
                <td className="text-right">
                  <button onClick={() => upd(pts.filter((_, k) => k !== i))} aria-label="Remove point">
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => upd([...pts, { weight: 2200, fwd: 37, aft: 47.3 }])}
        >
          <Plus className="size-4" /> Add point
        </Button>
      </div>
    );
  };

  return (
    <div>
      <PageTitle title={row.tail_number} subtitle={`Based on the Cessna 172${row.base_type} template`} />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <Label className="label-caps mb-1 block">Tail number</Label>
          <Input className="num w-36" value={tail} onChange={(e) => setTail(e.target.value.toUpperCase())} />
        </div>
        <div>
          <Label className="label-caps mb-1 block">Name</Label>
          <Input className="w-56" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button className="ml-auto" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <Save className="size-4" /> Save
        </Button>
      </div>

      <Tabs defaultValue="basics">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="envelope">CG envelope</TabsTrigger>
          <TabsTrigger value="takeoff">Takeoff</TabsTrigger>
          <TabsTrigger value="landing">Landing</TabsTrigger>
          <TabsTrigger value="speeds">Speeds</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider">Weights</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <NumField label="Empty weight" suffix="lbs" step={0.1} value={data.emptyWeight} onChange={(v) => set({ emptyWeight: v })} />
              <NumField label="Empty weight arm" suffix="in" step={0.01} value={data.emptyArm} onChange={(v) => set({ emptyArm: v })} />
              <NumField label="Max ramp" suffix="lbs" value={data.maxRamp} onChange={(v) => set({ maxRamp: v })} />
              <NumField label="Max takeoff" suffix="lbs" value={data.maxTakeoff} onChange={(v) => set({ maxTakeoff: v })} />
              <NumField label="Max landing" suffix="lbs" value={data.maxLanding} onChange={(v) => set({ maxLanding: v })} />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider">Station arms</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["pilot", "Pilot & front seat"],
                  ["rear", "Rear seat"],
                  ["bag1", "Baggage area 1"],
                  ["bag2", "Baggage area 2"],
                  ["fuel", "Fuel"],
                ] as const
              ).map(([key, label]) => (
                <NumField
                  key={key}
                  label={label}
                  suffix="in"
                  step={0.1}
                  value={data.arms[key]}
                  onChange={(v) => set({ arms: { ...data.arms, [key]: v } })}
                />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider">Fuel & taxi allowance</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <NumField label="Usable fuel" suffix="gal" step={0.1} value={data.fuel.usableGal} onChange={(v) => set({ fuel: { ...data.fuel, usableGal: v } })} />
              <NumField label="Fuel weight" suffix="lb/gal" step={0.1} value={data.fuel.lbsPerGal} onChange={(v) => set({ fuel: { ...data.fuel, lbsPerGal: v } })} />
              <NumField label="Start & taxi weight" suffix="lbs" value={data.startTaxi.weight} onChange={(v) => set({ startTaxi: { ...data.startTaxi, weight: v } })} />
              <NumField label="Start & taxi moment" suffix="in-lb" value={data.startTaxi.moment} onChange={(v) => set({ startTaxi: { ...data.startTaxi, moment: v } })} />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider">Wind & surface adjustments</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <NumField label="Headwind decrease" suffix="%" value={data.wind.headwindPct} onChange={(v) => set({ wind: { ...data.wind, headwindPct: v } })} />
              <NumField label="…per knots headwind" suffix="kt" value={data.wind.headwindPerKt} onChange={(v) => set({ wind: { ...data.wind, headwindPerKt: v } })} />
              <div />
              <NumField label="Tailwind increase" suffix="%" value={data.wind.tailwindPct} onChange={(v) => set({ wind: { ...data.wind, tailwindPct: v } })} />
              <NumField label="…per knots tailwind" suffix="kt" value={data.wind.tailwindPerKt} onChange={(v) => set({ wind: { ...data.wind, tailwindPerKt: v } })} />
              <NumField label="Tailwind limit" suffix="kt" value={data.wind.tailwindLimitKt} onChange={(v) => set({ wind: { ...data.wind, tailwindLimitKt: v } })} />
              <NumField label="Dry grass increase" suffix="%" value={data.wind.grassPct} onChange={(v) => set({ wind: { ...data.wind, grassPct: v } })} />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="envelope" className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            {envEditor("envelopeNormal", "Normal category")}
            {envEditor("envelopeUtility", "Utility category")}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <CgChart normal={data.envelopeNormal} utility={data.envelopeUtility} points={[]} />
          </div>
        </TabsContent>

        <TabsContent value="takeoff">
          <PerfTableEditor kind="takeoff" tables={data.takeoff} onChange={(t) => set({ takeoff: t })} />
        </TabsContent>

        <TabsContent value="landing">
          <PerfTableEditor kind="landing" tables={data.landing} onChange={(t) => set({ landing: t })} />
        </TabsContent>

        <TabsContent value="speeds" className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider">Stall speeds</h3>
              <Input
                className="w-24"
                value={data.stall.unit}
                onChange={(e) => set({ stall: { ...data.stall, unit: e.target.value } })}
              />
            </div>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="label-caps text-left">
                  <th className="py-1">Bank</th>
                  {data.stall.flaps.map((f, i) => (
                    <th key={i}>
                      <input
                        value={f}
                        onChange={(e) => {
                          const flaps = [...data.stall.flaps];
                          flaps[i] = e.target.value;
                          set({ stall: { ...data.stall, flaps } });
                        }}
                        className="w-16 rounded border border-transparent bg-transparent px-1 hover:border-border focus:border-ring focus:outline-none"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.stall.rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-border">
                    <td className="py-1">
                      <CellInput
                        value={r.bank}
                        onChange={(v) =>
                          set({
                            stall: {
                              ...data.stall,
                              rows: data.stall.rows.map((q, k) => (k === ri ? { ...q, bank: v } : q)),
                            },
                          })
                        }
                      />
                      °
                    </td>
                    {data.stall.flaps.map((_, ci) => (
                      <td key={ci}>
                        <CellInput
                          value={r.values[ci] ?? 0}
                          onChange={(v) =>
                            set({
                              stall: {
                                ...data.stall,
                                rows: data.stall.rows.map((q, k) => {
                                  if (k !== ri) return q;
                                  const values = [...q.values];
                                  values[ci] = v;
                                  return { ...q, values };
                                }),
                              },
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
              Airspeed calibration (KIAS → KCAS)
            </h3>
            <table className="mt-3 w-full max-w-md text-sm">
              <thead>
                <tr className="label-caps text-left">
                  <th className="py-1">Flaps</th>
                  <th>KIAS</th>
                  <th>KCAS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.calibration.map((c, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1">
                      <input
                        value={c.flaps}
                        onChange={(e) =>
                          set({
                            calibration: data.calibration.map((q, k) =>
                              k === i ? { ...q, flaps: e.target.value } : q,
                            ),
                          })
                        }
                        className="w-20 rounded border border-transparent bg-transparent px-1 hover:border-border focus:border-ring focus:outline-none"
                      />
                    </td>
                    <td>
                      <CellInput
                        value={c.kias}
                        onChange={(v) =>
                          set({ calibration: data.calibration.map((q, k) => (k === i ? { ...q, kias: v } : q)) })
                        }
                      />
                    </td>
                    <td>
                      <CellInput
                        value={c.kcas}
                        onChange={(v) =>
                          set({ calibration: data.calibration.map((q, k) => (k === i ? { ...q, kcas: v } : q)) })
                        }
                      />
                    </td>
                    <td className="text-right">
                      <button onClick={() => set({ calibration: data.calibration.filter((_, k) => k !== i) })}>
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => set({ calibration: [...data.calibration, { flaps: "Up", kias: 60, kcas: 62 }] })}
            >
              <Plus className="size-4" /> Add row
            </Button>
          </section>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex gap-2">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <Save className="size-4" /> Save changes
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: "/aircraft" })}>
          Back
        </Button>
      </div>
    </div>
  );
}