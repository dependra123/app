import type { AircraftData, EnvelopePoint, PerfTable } from "./aircraft-types";

export type WBInputs = {
  pilot: number;
  rear: number;
  bag1: number;
  bag2: number;
  fuelGal: number;
  burnGal: number;
};

export type WBRow = { label: string; weight: number; arm: number; moment: number };

export type Stage = { weight: number; moment: number; cg: number };

export type WBResult = {
  rows: WBRow[];
  fuelLbs: number;
  burnLbs: number;
  zeroFuel: Stage;
  ramp: Stage;
  takeoff: Stage;
  landing: Stage;
};

function stage(weight: number, moment: number): Stage {
  return { weight, moment, cg: weight ? moment / weight : 0 };
}

export function computeWB(a: AircraftData, i: WBInputs): WBResult {
  const lpg = a.fuel.lbsPerGal || 6;
  const rows: WBRow[] = [
    {
      label: "Empty Weight",
      weight: a.emptyWeight,
      arm: a.emptyArm,
      moment: a.emptyWeight * a.emptyArm,
    },
    { label: "Pilot & Front Seat", weight: i.pilot, arm: a.arms.pilot, moment: i.pilot * a.arms.pilot },
    { label: "Rear Seat", weight: i.rear, arm: a.arms.rear, moment: i.rear * a.arms.rear },
    { label: "Baggage — Area 1", weight: i.bag1, arm: a.arms.bag1, moment: i.bag1 * a.arms.bag1 },
    { label: "Baggage — Area 2", weight: i.bag2, arm: a.arms.bag2, moment: i.bag2 * a.arms.bag2 },
  ];
  const zfw = rows.reduce((s, r) => s + r.weight, 0);
  const zfm = rows.reduce((s, r) => s + r.moment, 0);
  const fuelLbs = i.fuelGal * lpg;
  const burnLbs = i.burnGal * lpg;
  const rampW = zfw + fuelLbs;
  const rampM = zfm + fuelLbs * a.arms.fuel;
  const toW = rampW + a.startTaxi.weight;
  const toM = rampM + a.startTaxi.moment;
  const ldW = toW - burnLbs;
  const ldM = toM - burnLbs * a.arms.fuel;
  return {
    rows,
    fuelLbs,
    burnLbs,
    zeroFuel: stage(zfw, zfm),
    ramp: stage(rampW, rampM),
    takeoff: stage(toW, toM),
    landing: stage(ldW, ldM),
  };
}

export function limitsAt(env: EnvelopePoint[], weight: number): { fwd: number; aft: number } | null {
  const pts = [...env].sort((x, y) => x.weight - y.weight);
  if (!pts.length) return null;
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  if (weight < first.weight) return { fwd: first.fwd, aft: first.aft };
  if (weight > last.weight) return null;
  for (let k = 0; k < pts.length - 1; k++) {
    const lo = pts[k]!;
    const hi = pts[k + 1]!;
    if (weight >= lo.weight && weight <= hi.weight) {
      const t = hi.weight === lo.weight ? 0 : (weight - lo.weight) / (hi.weight - lo.weight);
      return { fwd: lo.fwd + t * (hi.fwd - lo.fwd), aft: lo.aft + t * (hi.aft - lo.aft) };
    }
  }
  return null;
}

export type CategoryCheck = { inUtility: boolean; inNormal: boolean };

export function checkStage(a: AircraftData, s: Stage): CategoryCheck {
  const inside = (env: EnvelopePoint[]) => {
    const lim = limitsAt(env, s.weight);
    return !!lim && s.cg >= lim.fwd - 1e-6 && s.cg <= lim.aft + 1e-6;
  };
  return { inUtility: inside(a.envelopeUtility), inNormal: inside(a.envelopeNormal) };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function bracket(values: number[], x: number): [number, number, number] {
  const v = values;
  if (!v.length) return [0, 0, 0];
  if (x <= v[0]!) return [0, 0, 0];
  if (x >= v[v.length - 1]!) return [v.length - 1, v.length - 1, 0];
  for (let k = 0; k < v.length - 1; k++) {
    if (x >= v[k]! && x <= v[k + 1]!) {
      const t = (x - v[k]!) / (v[k + 1]! - v[k]!);
      return [k, k + 1, t];
    }
  }
  return [0, 0, 0];
}

function interpTable(t: PerfTable, palt: number, temp: number) {
  const [a0, a1, at] = bracket(t.altitudes, palt);
  const [t0, t1, tt] = bracket(t.temps, temp);
  const pick = (ai: number, ti: number) => t.cells[ai]?.[ti] ?? { roll: 0, obs: 0 };
  const roll = lerp(
    lerp(pick(a0, t0).roll, pick(a0, t1).roll, tt),
    lerp(pick(a1, t0).roll, pick(a1, t1).roll, tt),
    at,
  );
  const obs = lerp(
    lerp(pick(a0, t0).obs, pick(a0, t1).obs, tt),
    lerp(pick(a1, t0).obs, pick(a1, t1).obs, tt),
    at,
  );
  return { roll, obs };
}

export type PerfResult = {
  baseRoll: number;
  baseObs: number;
  roll: number;
  obs: number;
  steps: string[];
  conditions: string;
  tablesUsed: string;
};

export function computePerf(
  tables: PerfTable[],
  opts: {
    weight: number;
    palt: number;
    temp: number;
    headwind: number;
    grass: boolean;
    wind: AircraftData["wind"];
  },
): PerfResult | null {
  if (!tables.length) return null;
  const sorted = [...tables].sort((a, b) => a.weight - b.weight);
  let base: { roll: number; obs: number };
  let tablesUsed: string;
  let conditions: string;
  const w = opts.weight;
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  if (sorted.length === 1 || w <= first.weight) {
    base = interpTable(first, opts.palt, opts.temp);
    tablesUsed = `${first.weight} lb chart`;
    conditions = first.conditions;
  } else if (w >= last.weight) {
    base = interpTable(last, opts.palt, opts.temp);
    tablesUsed = `${last.weight} lb chart`;
    conditions = last.conditions;
  } else {
    let lo = first;
    let hi = last;
    for (let k = 0; k < sorted.length - 1; k++) {
      if (w >= sorted[k]!.weight && w <= sorted[k + 1]!.weight) {
        lo = sorted[k]!;
        hi = sorted[k + 1]!;
        break;
      }
    }
    const t = (w - lo.weight) / (hi.weight - lo.weight);
    const a = interpTable(lo, opts.palt, opts.temp);
    const b = interpTable(hi, opts.palt, opts.temp);
    base = { roll: lerp(a.roll, b.roll, t), obs: lerp(a.obs, b.obs, t) };
    tablesUsed = `interpolated between the ${lo.weight} lb and ${hi.weight} lb charts`;
    conditions = lo.conditions;
  }

  const steps: string[] = [
    `Chart base (${tablesUsed}) at ${Math.round(opts.palt)} ft PA / ${Math.round(opts.temp)}°C: ${Math.round(base.roll)} ft roll, ${Math.round(base.obs)} ft to clear 50 ft`,
  ];
  let factor = 1;
  const r = opts.wind;
  if (opts.headwind > 0.5 && r.headwindPerKt > 0) {
    const pct = (opts.headwind / r.headwindPerKt) * r.headwindPct;
    factor *= 1 - pct / 100;
    steps.push(`Headwind ${opts.headwind.toFixed(0)} kt → −${pct.toFixed(1)}%`);
  } else if (opts.headwind < -0.5 && r.tailwindPerKt > 0) {
    const raw = Math.abs(opts.headwind);
    const tail = r.tailwindLimitKt > 0 ? Math.min(raw, r.tailwindLimitKt) : raw;
    const pct = (tail / r.tailwindPerKt) * r.tailwindPct;
    factor *= 1 + pct / 100;
    steps.push(
      `Tailwind ${raw.toFixed(0)} kt → +${pct.toFixed(1)}%` +
        (r.tailwindLimitKt > 0 && raw > r.tailwindLimitKt
          ? ` (beyond the ${r.tailwindLimitKt} kt chart limit — verify manually)`
          : ""),
    );
  }
  if (opts.grass) {
    factor *= 1 + r.grassPct / 100;
    steps.push(`Dry grass runway → +${r.grassPct}%`);
  }
  return {
    baseRoll: base.roll,
    baseObs: base.obs,
    roll: base.roll * factor,
    obs: base.obs * factor,
    steps,
    conditions,
    tablesUsed,
  };
}

export function windComponents(runwayHeadingDeg: number, windDir: number, windSpeed: number) {
  const angle = (((windDir - runwayHeadingDeg) % 360) + 360) % 360;
  const rad = (angle * Math.PI) / 180;
  return {
    headwind: windSpeed * Math.cos(rad),
    crosswind: Math.abs(windSpeed * Math.sin(rad)),
    crosswindFrom: Math.sin(rad) > 0 ? "right" : "left",
  };
}

export function pressureAltitude(elevationFt: number, altimeterInHg: number) {
  return Math.round(elevationFt + (29.92 - altimeterInHg) * 1000);
}