import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listAirports, saveAirport, deleteAirport } from "@/lib/api.functions";
import { DEFAULT_AIRPORTS } from "@/lib/aircraft-types";

export const Route = createFileRoute("/_authenticated/airports")({
  component: AirportsPage,
});

function AirportsPage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAirports);
  const save = useServerFn(saveAirport);
  const remove = useServerFn(deleteAirport);
  const [icao, setIcao] = useState("");
  const [name, setName] = useState("");
  const [elev, setElev] = useState(0);

  const { data: airports = [] } = useQuery({ queryKey: ["airports"], queryFn: () => fetchAll() });

  const add = useMutation({
    mutationFn: (v: { icao: string; name: string | null; elevation_ft: number }) => save({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["airports"] });
      setIcao("");
      setName("");
      setElev(0);
      toast.success("Airport saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["airports"] }),
  });

  const missingDefaults = DEFAULT_AIRPORTS.filter(
    (d) => !airports.some((a) => a.icao === d.icao),
  );

  return (
    <div>
      <PageTitle
        title="Airports"
        subtitle="Field elevations used to compute pressure altitude from the METAR altimeter setting."
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label className="label-caps mb-1 block">ICAO</Label>
            <Input className="num" value={icao} onChange={(e) => setIcao(e.target.value.toUpperCase())} maxLength={4} />
          </div>
          <div className="sm:col-span-2">
            <Label className="label-caps mb-1 block">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="label-caps mb-1 block">Elevation (ft)</Label>
            <Input className="num" type="number" value={elev} onChange={(e) => setElev(Number(e.target.value))} />
          </div>
        </div>
        <Button
          className="mt-3"
          disabled={icao.length < 3}
          onClick={() => add.mutate({ icao, name: name || null, elevation_ft: elev })}
        >
          <Plus className="size-4" /> Add airport
        </Button>
      </div>

      {missingDefaults.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4">
          <p className="label-caps mb-2">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {missingDefaults.map((d) => (
              <Button
                key={d.icao}
                size="sm"
                variant="outline"
                onClick={() => add.mutate({ icao: d.icao, name: d.name, elevation_ft: d.elevation_ft })}
              >
                {d.icao} · {d.elevation_ft} ft
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <ul className="mt-5 space-y-2">
        {airports.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <span className="num font-semibold">{a.icao}</span>
            <span className="text-sm text-muted-foreground">{a.name}</span>
            <span className="num ml-auto text-sm">{Number(a.elevation_ft)} ft</span>
            <button onClick={() => del.mutate(a.id)} aria-label="Delete airport">
              <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}