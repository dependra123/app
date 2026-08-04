import { Plus, Trash2 } from "lucide-react";
import type { PerfTable } from "@/lib/aircraft-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CellInput } from "@/components/num-field";

export function PerfTableEditor({
  tables,
  onChange,
  kind,
}: {
  tables: PerfTable[];
  onChange: (t: PerfTable[]) => void;
  kind: "takeoff" | "landing";
}) {
  const update = (i: number, patch: Partial<PerfTable>) => {
    const next = tables.map((t, k) => (k === i ? { ...t, ...patch } : t));
    onChange(next);
  };

  const addBracket = () => {
    const base = tables[tables.length - 1];
    const clone: PerfTable = base
      ? {
          ...structuredClone(base),
          id: `${kind}-${Date.now()}`,
          weight: base.weight - 100,
        }
      : {
          id: `${kind}-${Date.now()}`,
          weight: 2400,
          conditions: "",
          temps: [0, 10, 20, 30, 40],
          altitudes: [0, 2000, 4000, 6000, 8000],
          cells: Array.from({ length: 5 }, () =>
            Array.from({ length: 5 }, () => ({ roll: 0, obs: 0 })),
          ),
        };
    onChange([...tables, clone]);
  };

  return (
    <div className="space-y-6">
      {tables.map((t, ti) => (
        <div key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="label-caps mb-1 block">Weight bracket</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="num w-28"
                  value={t.weight}
                  onChange={(e) => update(ti, { weight: Number(e.target.value) })}
                />
                <span className="text-sm text-muted-foreground">lbs</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => onChange(tables.filter((_, k) => k !== ti))}
            >
              <Trash2 className="size-4 text-destructive" /> Remove bracket
            </Button>
          </div>

          <div className="mt-3">
            <Label className="label-caps mb-1 block">Reference conditions</Label>
            <Textarea
              rows={2}
              value={t.conditions}
              onChange={(e) => update(ti, { conditions: e.target.value })}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-xs">
              <thead>
                <tr>
                  <th className="label-caps sticky left-0 bg-card p-1 text-left">Press Alt</th>
                  {t.temps.map((temp, tempIdx) => (
                    <th key={tempIdx} className="p-1 text-center">
                      <input
                        type="number"
                        value={temp}
                        onChange={(e) => {
                          const temps = [...t.temps];
                          temps[tempIdx] = Number(e.target.value);
                          update(ti, { temps });
                        }}
                        className="num w-12 rounded border border-transparent bg-transparent px-1 text-center hover:border-border focus:border-ring focus:outline-none"
                      />
                      <span className="text-muted-foreground">°C</span>
                      <div className="label-caps mt-0.5 text-[10px]">roll / 50 ft</div>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {t.altitudes.map((alt, ai) => (
                  <tr key={ai} className="border-t border-border">
                    <td className="sticky left-0 bg-card p-1">
                      <input
                        type="number"
                        step={500}
                        value={alt}
                        onChange={(e) => {
                          const altitudes = [...t.altitudes];
                          altitudes[ai] = Number(e.target.value);
                          update(ti, { altitudes });
                        }}
                        className="num w-16 rounded border border-transparent bg-transparent px-1 hover:border-border focus:border-ring focus:outline-none"
                      />
                    </td>
                    {t.temps.map((_, tempIdx) => {
                      const cell = t.cells[ai]?.[tempIdx] ?? { roll: 0, obs: 0 };
                      const setCell = (patch: { roll?: number; obs?: number }) => {
                        const cells = t.cells.map((row) => row.map((c) => ({ ...c })));
                        while (cells.length <= ai) cells.push([]);
                        const row = cells[ai]!;
                        while (row.length <= tempIdx) row.push({ roll: 0, obs: 0 });
                        row[tempIdx] = { ...row[tempIdx]!, ...patch };
                        update(ti, { cells });
                      };
                      return (
                        <td key={tempIdx} className="p-1 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <CellInput value={cell.roll} onChange={(v) => setCell({ roll: v })} />
                            <span className="text-muted-foreground">/</span>
                            <CellInput value={cell.obs} onChange={(v) => setCell({ obs: v })} />
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-1">
                      <button
                        type="button"
                        onClick={() =>
                          update(ti, {
                            altitudes: t.altitudes.filter((_, k) => k !== ai),
                            cells: t.cells.filter((_, k) => k !== ai),
                          })
                        }
                        aria-label="Remove row"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() =>
              update(ti, {
                altitudes: [...t.altitudes, (t.altitudes[t.altitudes.length - 1] ?? 0) + 1000],
                cells: [...t.cells, t.temps.map(() => ({ roll: 0, obs: 0 }))],
              })
            }
          >
            <Plus className="size-4" /> Add altitude row
          </Button>
        </div>
      ))}
      <Button variant="secondary" onClick={addBracket}>
        <Plus className="size-4" /> Add weight bracket
      </Button>
    </div>
  );
}