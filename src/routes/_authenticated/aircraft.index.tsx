import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listAircraft, saveAircraft, deleteAircraft } from "@/lib/api.functions";
import { TEMPLATES, templateData } from "@/lib/aircraft-types";

export const Route = createFileRoute("/_authenticated/aircraft/")({
  component: AircraftList,
});

function AircraftList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAircraft);
  const create = useServerFn(saveAircraft);
  const remove = useServerFn(deleteAircraft);
  const [open, setOpen] = useState(false);
  const [tail, setTail] = useState("C-G");
  const [type, setType] = useState<"R" | "S">("R");

  const { data: aircraft = [], isLoading } = useQuery({
    queryKey: ["aircraft"],
    queryFn: () => fetchAll(),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          tail_number: tail.toUpperCase(),
          name: TEMPLATES[type].label,
          base_type: type,
          data: templateData(type),
        },
      }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["aircraft"] });
      setOpen(false);
      toast.success("Aircraft created from template");
      if (row?.id) navigate({ to: "/aircraft/$id", params: { id: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aircraft"] });
      toast.success("Aircraft deleted");
    },
  });

  return (
    <div>
      <PageTitle title="Aircraft" subtitle="Clone a base template, then tune it to your tail number." />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="mb-5">
            <Plus className="size-4" /> Add aircraft
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New aircraft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="label-caps mb-1 block">Start from template</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["R", "S"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      type === t ? "border-primary bg-secondary" : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="font-display font-semibold">{TEMPLATES[t].label}</div>
                    <div className="num text-xs text-muted-foreground">
                      MTOW {TEMPLATES[t].data.maxTakeoff} lb
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="tail" className="label-caps mb-1 block">
                Tail number
              </Label>
              <Input id="tail" value={tail} onChange={(e) => setTail(e.target.value.toUpperCase())} className="num" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || tail.length < 3}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : aircraft.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No aircraft yet. Create one from the 172R or 172S template to get started.
        </div>
      ) : (
        <ul className="space-y-2">
          {aircraft.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0">
                <div className="num text-base font-semibold">{a.tail_number}</div>
                <div className="text-xs text-muted-foreground">
                  {a.name ?? `Cessna 172${a.base_type}`} · base type {a.base_type}
                </div>
              </div>
              <div className="ml-auto flex gap-1">
                <Link to="/aircraft/$id" params={{ id: a.id }}>
                  <Button variant="outline" size="sm">
                    <Pencil className="size-4" /> Edit
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete ${a.tail_number}?`)) delMutation.mutate(a.id);
                  }}
                >
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