import type { EnvelopePoint } from "@/lib/aircraft-types";

type Point = { label: string; cg: number; weight: number; color: string };

export function CgChart({
  normal,
  utility,
  points,
}: {
  normal: EnvelopePoint[];
  utility: EnvelopePoint[];
  points: Point[];
}) {
  const W = 520;
  const H = 400;
  const pad = { l: 46, r: 46, t: 24, b: 40 };
  const xMin = 34;
  const xMax = 49;
  const yMin = 1500;
  const yMax = 2650;
  const px = (cg: number) => pad.l + ((cg - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const py = (w: number) => H - pad.b - ((w - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);

  const path = (pts: EnvelopePoint[]) => {
    const s = [...pts].sort((a, b) => a.weight - b.weight);
    if (s.length < 2) return "";
    const fwd = s.map((p) => `${px(p.fwd)},${py(p.weight)}`);
    const aft = [...s].reverse().map((p) => `${px(p.aft)},${py(p.weight)}`);
    return `M${[...fwd, ...aft].join(" L")} Z`;
  };

  const xTicks = [34, 36, 38, 40, 42, 44, 46, 48];
  const yTicks = [1500, 1700, 1900, 2100, 2300, 2500];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Centre of gravity envelope">
      <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} fill="var(--card)" stroke="var(--border)" />
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line x1={px(t)} y1={pad.t} x2={px(t)} y2={H - pad.b} stroke="var(--border)" strokeWidth={0.5} />
          <text x={px(t)} y={H - pad.b + 14} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
            {t}
          </text>
        </g>
      ))}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={pad.l} y1={py(t)} x2={W - pad.r} y2={py(t)} stroke="var(--border)" strokeWidth={0.5} />
          <text x={pad.l - 6} y={py(t) + 3} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
            {t}
          </text>
          <text x={W - pad.r + 6} y={py(t) + 3} fontSize={10} fill="var(--muted-foreground)">
            {Math.round(t * 0.4536)}
          </text>
        </g>
      ))}
      <path d={path(utility)} fill="var(--muted)" stroke="var(--muted-foreground)" strokeWidth={1.2} />
      <path d={path(normal)} fill="none" stroke="var(--primary)" strokeWidth={1.8} />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={px(p.cg)} cy={py(p.weight)} r={5} fill={p.color} stroke="var(--card)" strokeWidth={1.5} />
          <text x={px(p.cg) + 8} y={py(p.weight) - 6} fontSize={10} fontWeight={600} fill={p.color}>
            {p.label}
          </text>
        </g>
      ))}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
        C.G. — inches aft of datum
      </text>
      <text x={12} y={H / 2} fontSize={10} fill="var(--muted-foreground)" transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">
        Weight (lb)
      </text>
      <text x={W - 8} y={H / 2} fontSize={10} fill="var(--muted-foreground)" transform={`rotate(90 ${W - 8} ${H / 2})`} textAnchor="middle">
        Weight (kg)
      </text>
    </svg>
  );
}