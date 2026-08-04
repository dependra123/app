import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, FileText } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { listFlights, deleteFlight } from "@/lib/api.functions";

export const Route = createFileRoute("/_authenticated/flights")({
  component: FlightsPage,
});

function FlightsPage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listFlights);
  const remove = useServerFn(deleteFlight);
  const { data: flights = [], isLoading } = useQuery({ queryKey: ["flights"], queryFn: () => fetchAll() });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flights"] }),
  });

  return (
    <div>
      <PageTitle title="Flight history" subtitle="Re-open a saved flight to edit it or download the report again." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : flights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No saved flights yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {flights.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <FileText className="size-4 text-accent" />
              <div>
                <div className="font-semibold">{f.title ?? "Untitled flight"}</div>
                <div className="num text-xs text-muted-foreground">
                  {f.flight_date ?? new Date(f.created_at).toISOString().slice(0, 10)}
                </div>
              </div>
              <div className="ml-auto flex gap-1">
                <Link to="/plan" search={{ flight: f.id }}>
                  <Button size="sm" variant="outline">
                    Open
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(f.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}